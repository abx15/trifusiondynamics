import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EscalationLevel,
  EscalationTrigger,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWorkService } from '../../../common/prisma/unit-of-work.service';
import { OutboxPublisher } from '../../../common/events/outbox.publisher';
import { DOMAIN_EVENTS } from '../../../common/events/domain-event.interface';
import { AuditService } from '../../../common/audit/audit.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { SlaEngineService } from './sla-engine.service';

/**
 * Statuses whose clocks are still running.
 * Everything else is either paused or finished, so the monitor ignores it.
 */
const ACTIVE_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.ASSIGNED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.RESOLUTION_SUBMITTED,
  TicketStatus.UNDER_VERIFICATION,
  TicketStatus.REOPENED,
];

/** Bound on how many tickets one tick inspects, so the job cannot stall. */
const SCAN_LIMIT = 500;

/** Escalation to Super Admin once a breach is this far past due. */
const CRITICAL_BREACH_MINUTES = 60;

@Injectable()
export class SlaMonitorJob {
  private readonly logger = new Logger(SlaMonitorJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWorkService,
    private readonly engine: SlaEngineService,
    private readonly outbox: OutboxPublisher,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Detects SLA warnings and breaches.
   *
   * Warnings and breaches are emitted by writing `slaResponseWarnedAt` /
   * `slaResolutionWarnedAt` / `*BreachedAt` timestamps. Because the update is
   * conditional on those columns still being null, each warning/breach is raised
   * exactly once even if several ticks overlap or the process restarts.
   *
   * Paused tickets are skipped entirely: a ticket waiting on the client has not
   * breached anything.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scan(): Promise<void> {
    const now = new Date();

    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
        slaPausedAt: null,
        OR: [
          { firstResponseDeadline: { not: null } },
          { resolutionDeadline: { not: null } },
        ],
      },
      select: {
        id: true,
        organizationId: true,
        ticketNumber: true,
        status: true,
        priority: true,
        createdAt: true,
        firstResponseDeadline: true,
        firstRespondedAt: true,
        slaResponseWarnedAt: true,
        slaResponseBreachedAt: true,
        resolutionDeadline: true,
        resolvedAt: true,
        slaResolutionWarnedAt: true,
        slaResolutionBreachedAt: true,
        slaPausedAt: true,
        totalPausedDurationMs: true,
        assignedAgentId: true,
        departmentId: true,
        escalationLevel: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: SCAN_LIMIT,
    });

    if (tickets.length === 0) return;

    this.logger.debug(`SLA monitor inspecting ${tickets.length} ticket(s)`);

    for (const ticket of tickets) {
      try {
        await this.evaluate(ticket, now);
      } catch (error) {
        // One bad ticket must not stop the sweep.
        this.logger.error(
          `SLA evaluation failed for ticket ${ticket.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async evaluate(
    ticket: {
      id: string;
      organizationId: string;
      ticketNumber: string;
      status: TicketStatus;
      priority: string;
      createdAt: Date;
      firstResponseDeadline: Date | null;
      firstRespondedAt: Date | null;
      slaResponseWarnedAt: Date | null;
      slaResponseBreachedAt: Date | null;
      resolutionDeadline: Date | null;
      resolvedAt: Date | null;
      slaResolutionWarnedAt: Date | null;
      slaResolutionBreachedAt: Date | null;
      slaPausedAt: Date | null;
      totalPausedDurationMs: bigint;
      assignedAgentId: string | null;
      departmentId: string | null;
      escalationLevel: EscalationLevel;
    },
    now: Date,
  ): Promise<void> {
    // --- response clock ---
    const responseRunning =
      ticket.firstResponseDeadline !== null &&
      ticket.firstRespondedAt === null &&
      ticket.slaResponseBreachedAt === null;

    if (responseRunning) {
      const deadline = ticket.firstResponseDeadline as Date;
      if (now > deadline) {
        await this.raiseBreach(ticket, 'RESPONSE', now);
      } else if (
        ticket.slaResponseWarnedAt === null &&
        this.withinWarningThreshold(ticket, deadline, now)
      ) {
        await this.raiseWarning(ticket, 'RESPONSE', now);
      }
    }

    // --- resolution clock ---
    const resolutionRunning =
      ticket.resolutionDeadline !== null &&
      ticket.resolvedAt === null &&
      ticket.slaResolutionBreachedAt === null;

    if (resolutionRunning) {
      const deadline = ticket.resolutionDeadline as Date;
      if (now > deadline) {
        await this.raiseBreach(ticket, 'RESOLUTION', now);
      } else if (
        ticket.slaResolutionWarnedAt === null &&
        this.withinWarningThreshold(ticket, deadline, now)
      ) {
        await this.raiseWarning(ticket, 'RESOLUTION', now);
      }
    }
  }

  /**
   * A warning fires when the remaining time is within the configured percentage
   * of the window that has already elapsed. Computed against ACTIVE time so a
   * ticket with heavy pause history is not warned prematurely.
   */
  private withinWarningThreshold(
    ticket: {
      createdAt: Date;
      totalPausedDurationMs: bigint;
    },
    deadline: Date,
    now: Date,
  ): boolean {
    const totalWindowMs = Math.max(
      1,
      deadline.getTime() - ticket.createdAt.getTime(),
    );
    const activeElapsed = Math.max(
      0,
      now.getTime() -
        ticket.createdAt.getTime() -
        Number(ticket.totalPausedDurationMs),
    );
    const ratio = activeElapsed / totalWindowMs;
    return ratio >= 0.8;
  }

  private async raiseWarning(
    ticket: {
      id: string;
      organizationId: string;
      ticketNumber: string;
      assignedAgentId: string | null;
      departmentId: string | null;
    },
    clock: 'RESPONSE' | 'RESOLUTION',
    now: Date,
  ): Promise<void> {
    const data =
      clock === 'RESPONSE'
        ? { slaResponseWarnedAt: now }
        : { slaResolutionWarnedAt: now };

    await this.uow.run(async (tx) => {
      // Conditional write = the warning is recorded at most once.
      const updated = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          ...(clock === 'RESPONSE'
            ? { slaResponseWarnedAt: null }
            : { slaResolutionWarnedAt: null }),
        },
        data,
      });
      if (updated.count === 0) return;

      await this.outbox.publish(tx, {
        eventType:
          clock === 'RESPONSE'
            ? DOMAIN_EVENTS.SLA_RESPONSE_WARNING
            : DOMAIN_EVENTS.SLA_RESOLUTION_WARNING,
        organizationId: ticket.organizationId,
        correlationId: `sla-warn:${ticket.id}`,
        idempotencyKey: `sla-${clock.toLowerCase()}-warning:${ticket.id}`,
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          clock,
          assignedAgentId: ticket.assignedAgentId,
          departmentId: ticket.departmentId,
        },
      });

      // The assigned agent is the person who can still act on
      // the approaching deadline. The dedupe key matches the
      // outbox event's idempotency key, so a future outbox
      // processor replaying this event cannot duplicate it.
      if (ticket.assignedAgentId) {
        await this.notifications.record(tx, {
          userId: ticket.assignedAgentId,
          organizationId: ticket.organizationId,
          type: `sla.${clock.toLowerCase()}_warning`,
          severity: 'warning',
          title: 'SLA warning',
          message: `Ticket ${ticket.ticketNumber} is approaching its ${clock.toLowerCase()} SLA deadline.`,
          entityType: 'Ticket',
          entityId: ticket.id,
          actionUrl: `/tickets/${ticket.id}`,
          dedupeKey: `sla-${clock.toLowerCase()}-warning:${ticket.id}`,
        });
      }
    });
  }

  private async raiseBreach(
    ticket: {
      id: string;
      organizationId: string;
      ticketNumber: string;
      assignedAgentId: string | null;
      departmentId: string | null;
      escalationLevel: EscalationLevel;
    },
    clock: 'RESPONSE' | 'RESOLUTION',
    now: Date,
  ): Promise<void> {
    const data =
      clock === 'RESPONSE'
        ? { slaResponseBreachedAt: now }
        : { slaResolutionBreachedAt: now };

    await this.uow.run(async (tx) => {
      const updated = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          ...(clock === 'RESPONSE'
            ? { slaResponseBreachedAt: null }
            : { slaResolutionBreachedAt: null }),
        },
        data,
      });
      if (updated.count === 0) return;

      const overdueMs =
        clock === 'RESPONSE'
          ? now.getTime() -
            (
              (await this.deadlineFor(tx, ticket.id, 'response')) ?? now
            ).getTime()
          : now.getTime() -
            (
              (await this.deadlineFor(tx, ticket.id, 'resolution')) ?? now
            ).getTime();

      const isCritical = overdueMs >= CRITICAL_BREACH_MINUTES * 60_000;

      await this.outbox.publish(tx, {
        eventType:
          clock === 'RESPONSE'
            ? DOMAIN_EVENTS.SLA_RESPONSE_BREACHED
            : DOMAIN_EVENTS.SLA_RESOLUTION_BREACHED,
        organizationId: ticket.organizationId,
        correlationId: `sla-breach:${ticket.id}`,
        idempotencyKey: `sla-${clock.toLowerCase()}-breach:${ticket.id}`,
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          clock,
          assignedAgentId: ticket.assignedAgentId,
          departmentId: ticket.departmentId,
          isCritical,
          overdueMinutes: Math.max(0, Math.round(overdueMs / 60_000)),
        },
      });

      // Notify the assigned agent; the dedupe key matches the
      // outbox event so replays stay idempotent.
      if (ticket.assignedAgentId) {
        await this.notifications.record(tx, {
          userId: ticket.assignedAgentId,
          organizationId: ticket.organizationId,
          type: `sla.${clock.toLowerCase()}_breach`,
          severity: isCritical ? 'critical' : 'warning',
          title: 'SLA breached',
          message: `Ticket ${ticket.ticketNumber} breached its ${clock.toLowerCase()} SLA by ${Math.max(0, Math.round(overdueMs / 60_000))} minute(s).`,
          entityType: 'Ticket',
          entityId: ticket.id,
          actionUrl: `/tickets/${ticket.id}`,
          dedupeKey: `sla-${clock.toLowerCase()}-breach:${ticket.id}`,
        });
      }

      // A critical resolution breach escalates the ticket so Super Admin sees
      // it. Escalation is recorded on its own history row and never overwrites
      // the lifecycle status.
      if (isCritical && clock === 'RESOLUTION') {
        await tx.ticketEscalation.create({
          data: {
            ticketId: ticket.id,
            level: EscalationLevel.SUPER_ADMIN,
            trigger: EscalationTrigger.SLA_CRITICAL_BREACH,
            reason: `Resolution SLA breached by more than ${CRITICAL_BREACH_MINUTES} minutes`,
          },
        });

        if (ticket.escalationLevel !== EscalationLevel.SUPER_ADMIN) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              escalationLevel: EscalationLevel.SUPER_ADMIN,
              escalatedAt: now,
              escalationReason: 'Critical resolution SLA breach',
            },
          });
        }
      }

      await this.audit.recordSystem(tx, {
        organizationId: ticket.organizationId,
        action: 'ticket.sla_breached',
        entityType: 'Ticket',
        entityId: ticket.id,
        reason: `sla-monitor:${clock.toLowerCase()}`,
        metadata: {
          clock,
          isCritical,
          overdueMinutes: Math.max(0, Math.round(overdueMs / 60_000)),
        },
      });
    });
  }

  private async deadlineFor(
    tx: import('../../../common/prisma/unit-of-work.service').Tx,
    ticketId: string,
    clock: 'response' | 'resolution',
  ): Promise<Date | null> {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: {
        firstResponseDeadline: true,
        resolutionDeadline: true,
      },
    });
    return clock === 'response'
      ? (ticket?.firstResponseDeadline ?? null)
      : (ticket?.resolutionDeadline ?? null);
  }

  /** Exposed for the outbox processor so it can retry stale PROCESSING rows. */
  static get activeStatuses(): readonly TicketStatus[] {
    return ACTIVE_STATUSES;
  }
}
