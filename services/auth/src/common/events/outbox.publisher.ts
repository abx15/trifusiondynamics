import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { Tx } from '../prisma/unit-of-work.service';
import { OutboxPublisherLike } from './domain-event.interface';

/**
 * Writes domain events into `outbox.OutboxEvent` using the CALLER'S
 * transaction client.
 *
 * This is the single mechanism that makes events reliable: the event row is
 * committed in the same transaction as the business mutation, so it is
 * impossible to observe "ticket.assigned" for a transaction that rolled back,
 * or a committed assignment with no event at all.
 *
 * A downstream processor then performs the non-transactional side effects
 * (notifications, WebSocket push, analytics rollups).
 */
@Injectable()
export class OutboxPublisher implements OutboxPublisherLike {
  private readonly logger = new Logger(OutboxPublisher.name);

  async publish<T>(
    tx: Tx,
    event: {
      eventType: string;
      organizationId?: string | null;
      actorId?: string | null;
      correlationId?: string;
      idempotencyKey?: string;
      data: T;
    },
  ): Promise<{ eventId: string }> {
    const eventId = randomUUID();
    const correlationId = event.correlationId ?? randomUUID();

    const envelope = {
      eventId,
      eventType: event.eventType,
      organizationId: event.organizationId ?? null,
      correlationId,
      actorId: event.actorId ?? null,
      occurredAt: new Date().toISOString(),
      data: event.data as Record<string, unknown>,
    };

    try {
      await tx.outboxEvent.create({
        data: {
          id: eventId,
          eventType: event.eventType,
          payload: envelope as unknown as Prisma.InputJsonValue,
          organizationId: event.organizationId ?? null,
          idempotencyKey: event.idempotencyKey ?? null,
        },
      });
    } catch (error) {
      // A duplicate idempotencyKey means this exact event was already recorded,
      // which is the desired behaviour for retried producers — not an error.
      if (isUniqueViolation(error)) {
        this.logger.debug(
          `Outbox event ${event.eventType} already recorded for key ${event.idempotencyKey}`,
        );
        return { eventId };
      }
      throw error;
    }

    return { eventId };
  }

  /**
   * Writes several events atomically. Useful when one business operation
   * produces several distinct events (e.g. status change + SLA breach).
   */
  async publishMany<T>(
    tx: Tx,
    events: Array<{
      eventType: string;
      organizationId?: string | null;
      actorId?: string | null;
      correlationId?: string;
      idempotencyKey?: string;
      data: T;
    }>,
    correlationId?: string,
  ): Promise<string[]> {
    const shared = correlationId ?? randomUUID();
    const ids: string[] = [];
    for (const event of events) {
      const { eventId } = await this.publish(tx, {
        ...event,
        correlationId: event.correlationId ?? shared,
      });
      ids.push(eventId);
    }
    return ids;
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
