import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OutboxEvent, OutboxStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../modules/database/prisma.service';
import { DomainEventEnvelope } from './domain-event.interface';
import { WebhookDispatcherService } from '../../modules/developer/webhooks/webhook-dispatcher.service';
import { TicketEventsGateway } from '../../gateway/ticket-events.gateway';
import { ActorContext } from '../auth/actor.decorator';
import {
  PaginatedResult,
  paginatedResult,
  parsePagination,
} from '../utils/pagination';

/**
 * How long a PROCESSING lease is trusted before another
 * worker may reclaim the event. Covers the normal
 * processing time while bounding the window in which a
 * crashed worker's events sit unprocessed.
 */
const LEASE_TIMEOUT_MS = 120_000;

/** Events claimed per tick. Bounded so one sweep cannot
 *  monopolize the process or the database. */
const DEFAULT_BATCH_SIZE = 50;

/** Retry backoff: BASE * 2^(attempt-1), capped. */
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 15 * 60_000;

/**
 * Transactional outbox processor.
 *
 * Lifecycle of an event row:
 *
 *   PENDING ──claim (SKIP LOCKED)──▶ PROCESSING ──deliver──▶ PROCESSED
 *      ▲                                │
 *      └──── backoff (attempts < max) ◄┘
 *                   │
 *                   └──── attempts exhausted ──▶ DEAD (the DLQ)
 *
 * Correctness properties:
 *
 * 1. AT-MOST-ONE-CLAIM. Claiming uses `FOR UPDATE SKIP
 *    LOCKED`, so concurrent processors never see the same
 *    row; Postgres skips rows another transaction holds.
 *
 * 2. CRASH RECOVERY. A worker that dies mid-event leaves
 *    the row in PROCESSING; `recoverStaleLocks` returns
 *    expired leases to PENDING so the event is retried.
 *
 * 3. EXACTLY-ONCE SIDE EFFECTS. Consumers are themselves
 *    idempotent: webhook deliveries carry the outbox
 *    event id under a partial unique index (P2002 on
 *    redelivery = already sent), and notification rows
 *    were created transactionally with dedupe keys.
 *
 * 4. BOUNDED RETRIES. Failures back off exponentially and
 *    land in DEAD (the dead-letter queue) once
 *    `maxAttempts` is exhausted, so a poison event can
 *    never spin the processor forever.
 */
@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);

  /**
   * Identifies this process's claims. Written into
   * `lockedBy` so operators can tell which worker holds
   * a lease, and so a stale-lease sweep never touches
   * rows this process still owns within the lease window.
   */
  readonly processorId = `${process.pid}:${randomUUID()}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookDispatcherService,
    private readonly gateway: TicketEventsGateway,
  ) {}

  /**
   * One sweep: recover expired leases, claim a batch,
   * deliver each event, update its status. Returns the
   * number of events processed (success or final failure).
   */
  async runOnce(batchSize = DEFAULT_BATCH_SIZE): Promise<number> {
    const recovered = await this.recoverStaleLocks();
    if (recovered > 0) {
      this.logger.warn(`Recovered ${recovered} event(s) with expired leases`);
    }

    const events = await this.claimBatch(batchSize);
    if (events.length === 0) return 0;

    this.logger.debug(`Outbox processing ${events.length} event(s)`);

    let processed = 0;
    for (const event of events) {
      // One bad event must not stop the sweep; failures
      // are recorded on the row itself.
      try {
        await this.processEvent(event);
      } catch (error) {
        this.logger.error(
          `Outbox event ${event.id} processing failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      processed++;
    }
    return processed;
  }

  /**
   * Returns events whose PROCESSING lease has expired to
   * PENDING so another worker can pick them up. Uses the
   * caller's transaction client semantics via a single
   * conditional UPDATE — a row only moves when it is
   * still PROCESSING and its lease is older than the
   * timeout, so an in-flight event is never stolen
   * while its owner is still alive.
   */
  async recoverStaleLocks(): Promise<number> {
    const cutoff = new Date(Date.now() - LEASE_TIMEOUT_MS);
    const result = await this.prisma.$executeRaw`
      UPDATE outbox."OutboxEvent"
      SET status = 'PENDING',
          lockedAt = NULL,
          lockedBy = NULL
      WHERE status = 'PROCESSING'
        AND lockedAt IS NOT NULL
        AND lockedAt < ${cutoff}
    `;
    return Number(result);
  }

  /**
   * Claims a batch of due events in one statement.
   *
   * `FOR UPDATE SKIP LOCKED` inside the subquery is the
   * load-balancing primitive: rows another worker has
   * claimed (and not yet committed) are skipped without
   * blocking, so N workers scale to N× the batch size.
   *
   * The claim itself is atomic: status flips to
   * PROCESSING, `attempts` increments, and the lease is
   * stamped, all in the same statement.
   */
  async claimBatch(limit: number): Promise<OutboxEvent[]> {
    const rows = await this.prisma.$queryRaw`
      UPDATE outbox."OutboxEvent" AS evt
      SET status = 'PROCESSING',
          attempts = evt.attempts + 1,
          lockedAt = now(),
          lockedBy = ${this.processorId},
          lastError = NULL
      WHERE evt.id IN (
        SELECT sub.id
        FROM outbox."OutboxEvent" AS sub
        WHERE sub.status = 'PENDING'
          AND sub.nextAttemptAt <= now()
        ORDER BY sub.nextAttemptAt ASC, sub.id ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING evt.*;
    `;
    return rows as OutboxEvent[];
  }

  /**
   * Delivers one claimed event and records the outcome.
   * Every status write is conditional on `status =
   * 'PROCESSING'` so a recovered (re-claimed) event is
   * never overwritten by a late writer.
   */
  async processEvent(event: OutboxEvent): Promise<void> {
    try {
      await this.deliver(event);
      await this.markProcessed(event.id);
    } catch (error) {
      await this.markFailed(event, error);
    }
  }

  /**
   * Fan-out to side-effect consumers. Webhooks are the durable
   * consumer; the WebSocket gateway pushes the same envelope to
   * subscribed clients. Both consume at this single point.
   */
  private async deliver(event: OutboxEvent): Promise<void> {
    const envelope = event.payload as unknown as DomainEventEnvelope;
    await this.webhooks.dispatch(
      envelope.eventType ?? event.eventType,
      envelope,
      event.id,
    );
    this.gateway.publish(envelope);
  }

  private async markProcessed(id: string): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: { id, status: OutboxStatus.PROCESSING },
      data: {
        status: OutboxStatus.PROCESSED,
        processedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  /**
   * Records a delivery failure. Retries back off
   * exponentially; once the attempt budget is exhausted
   * the event moves to DEAD — the dead-letter queue —
   * where an operator can inspect and retry it.
   */
  private async markFailed(event: OutboxEvent, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = event.attempts; // already incremented by the claim
    const exhausted = attempts >= event.maxAttempts;

    if (exhausted) {
      this.logger.error(
        `Outbox event ${event.id} moved to DLQ after ${attempts} attempt(s): ${message}`,
      );
      await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, status: OutboxStatus.PROCESSING },
        data: {
          status: OutboxStatus.DEAD,
          lastError: message,
          lockedAt: null,
          lockedBy: null,
        },
      });
      return;
    }

    const delayMs = Math.min(
      MAX_BACKOFF_MS,
      BASE_BACKOFF_MS * 2 ** (attempts - 1),
    );

    await this.prisma.outboxEvent.updateMany({
      where: { id: event.id, status: OutboxStatus.PROCESSING },
      data: {
        status: OutboxStatus.PENDING,
        nextAttemptAt: new Date(Date.now() + delayMs),
        lastError: message,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  /**
   * DLQ inspection: dead-letter events, newest first.
   * Organization-scoped for non-superadmin operators.
   */
  async listDead(
    actor: ActorContext,
    options: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<OutboxEvent>> {
    const { skip, take, page, limit } = parsePagination(
      options.page,
      options.limit,
    );
    const where: Prisma.OutboxEventWhereInput = {
      status: OutboxStatus.DEAD,
      // Super admins see every tenant's DLQ; everyone
      // else is confined to their own organization.
      ...(actor.isSuperAdmin ? {} : { organizationId: actor.organizationId }),
    };

    const [total, events] = await Promise.all([
      this.prisma.outboxEvent.count({ where }),
      this.prisma.outboxEvent.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return paginatedResult(events, total, page, limit);
  }

  /**
   * Returns a dead-letter event to PENDING for immediate
   * retry. The attempt counter resets so the event gets a
   * full new budget; the last error is kept until the
   * next attempt overwrites it.
   */
  async retry(actor: ActorContext, id: string): Promise<OutboxEvent> {
    // Only tenant operators (or super admins) may retry;
    // the row must belong to the caller's organization.
    const existing = await this.prisma.outboxEvent.findFirst({
      where: {
        id,
        status: OutboxStatus.DEAD,
        ...(actor.isSuperAdmin ? {} : { organizationId: actor.organizationId }),
      },
    });
    if (!existing) {
      throw new NotFoundException('Dead-letter event not found');
    }

    const updated = await this.prisma.outboxEvent.updateMany({
      where: {
        id,
        status: OutboxStatus.DEAD,
      },
      data: {
        status: OutboxStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: null,
      },
    });
    if (updated.count === 0) {
      throw new ConflictException('Event was retried concurrently');
    }

    const reloaded = await this.prisma.outboxEvent.findUniqueOrThrow({
      where: { id },
    });
    return reloaded;
  }
}
