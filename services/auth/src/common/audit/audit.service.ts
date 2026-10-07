import { Injectable, Logger } from '@nestjs/common';
import { Prisma, TicketEscalation, TicketStatus } from '@prisma/client';
import { Tx } from '../prisma/unit-of-work.service';
import { ActorContext } from '../auth/actor.decorator';

/**
 * Append-only audit trail.
 *
 * Deliberately has no `update` and no `delete` method, and the table has
 * UPDATE/DELETE revoked from PUBLIC in the migration. Writes always go through
 * the caller's transaction so an audited action can never diverge from the
 * business change it describes.
 *
 * `actorType: 'SYSTEM'` is the authoritative representation of automated
 * actions (cron jobs, outbox retries). No fake User row is created and
 * `actorId` stays null, so a system action can never be mistaken for — or
 * escalated into — a privileged human session.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async record(
    tx: Tx,
    entry: {
      organizationId: string;
      action: string;
      entityType: string;
      entityId: string;
      actor?: Pick<
        ActorContext,
        'userId' | 'email' | 'ipAddress' | 'userAgent' | 'requestId'
      > | null;
      /** Omit to record a SYSTEM-originated action. */
      actorId?: string | null;
      actorLabel?: string | null;
      before?: unknown;
      after?: unknown;
      metadata?: unknown;
    },
  ): Promise<void> {
    const isSystem = !entry.actor && !entry.actorId;

    // Nullable JSON columns need Prisma's explicit sentinel rather than `null`,
    // otherwise Prisma stores a JSON `null` instead of SQL NULL. Omitting the
    // key entirely produces SQL NULL, which is what "not recorded" means here.
    await tx.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorType: isSystem ? 'SYSTEM' : 'USER',
        actorId: isSystem
          ? null
          : (entry.actorId ?? entry.actor?.userId ?? null),
        actorLabel: isSystem
          ? (entry.actorLabel ?? 'system')
          : (entry.actor?.email ?? entry.actorLabel ?? null),
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ...(entry.before != null ? { before: entry.before } : {}),
        ...(entry.after != null ? { after: entry.after } : {}),
        ...(entry.metadata != null ? { metadata: entry.metadata } : {}),
        ipAddress: entry.actor?.ipAddress ?? null,
        userAgent: entry.actor?.userAgent ?? null,
        requestId: entry.actor?.requestId ?? null,
      },
    });
  }

  /**
   * Audit helper for automated work. Kept separate so call sites make the
   * system-actor intent explicit rather than passing nulls around.
   */
  async recordSystem(
    tx: Tx,
    entry: {
      organizationId: string;
      action: string;
      entityType: string;
      entityId: string;
      reason: string;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await this.record(tx, {
      organizationId: entry.organizationId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorLabel: entry.reason,
      metadata: entry.metadata,
    });
  }
}

/** Canonical audit action names. */
export const AUDIT_ACTIONS = {
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_STATUS_CHANGED: 'ticket.status_changed',
  TICKET_ASSIGNED: 'ticket.assigned',
  TICKET_UNASSIGNED: 'ticket.unassigned',
  TICKET_RESOLUTION_SUBMITTED: 'ticket.resolution_submitted',
  TICKET_RESOLUTION_VERIFIED: 'ticket.resolution_verified',
  TICKET_RESOLUTION_REJECTED: 'ticket.resolution_rejected',
  TICKET_REOPENED: 'ticket.reopened',
  TICKET_CLOSED: 'ticket.closed',
  TICKET_CLOSE_OVERRIDE: 'ticket.close_override',
  TICKET_CANCELLED: 'ticket.cancelled',
  TICKET_ESCALATED: 'ticket.escalated',
  TICKET_ESCALATION_CLEARED: 'ticket.escalation_cleared',
  TICKET_SLA_BREACHED: 'ticket.sla_breached',
  DEPARTMENT_CREATED: 'department.created',
  DEPARTMENT_UPDATED: 'department.updated',
  ROUTING_RULE_CREATED: 'routing_rule.created',
  ROUTING_RULE_UPDATED: 'routing_rule.updated',
  SLA_POLICY_CREATED: 'sla_policy.created',
  SLA_POLICY_UPDATED: 'sla_policy.updated',
} as const;

/** Compact, diff-friendly snapshot of the ticket fields we audit. */
export function ticketSnapshot(ticket: {
  status: TicketStatus;
  priority?: unknown;
  category?: unknown;
  departmentId?: string | null;
  assignedAgentId?: string | null;
  escalationLevel?: TicketEscalation['level'];
  clientId?: string | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
}): Record<string, unknown> {
  return {
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    departmentId: ticket.departmentId ?? null,
    assignedAgentId: ticket.assignedAgentId ?? null,
    escalationLevel: ticket.escalationLevel,
    clientId: ticket.clientId ?? null,
    resolvedAt: ticket.resolvedAt ?? null,
    closedAt: ticket.closedAt ?? null,
  };
}
