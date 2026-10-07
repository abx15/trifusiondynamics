import { Injectable, Logger } from '@nestjs/common';
import { Tx } from '../../../common/prisma/unit-of-work.service';
import { NotificationsService } from '../../notifications/notifications.service';

/** Shape of the payload every ticket event carries. */
export interface TicketEventData {
  ticketId: string;
  ticketNumber: string;
  [key: string]: unknown;
}

export interface TicketEventEnvelope {
  eventType: string;
  organizationId: string | null;
  actorId: string | null;
  data: TicketEventData;
}

type Severity = 'info' | 'success' | 'warning' | 'critical';

interface Template {
  type: string;
  severity: Severity;
  title: string;
  message: (data: TicketEventData) => string;
  /** Recipients beyond the ticket participants (e.g. admins). */
  extraRecipients?: 'orgAdmins';
}

/**
 * Maps ticket domain events to durable Notification rows.
 *
 * Called INSIDE the producing transaction, so a notification can
 * never exist for a change that rolled back. Creation is idempotent:
 * the dedupe key is `eventType:ticketId:recipient`, which matches
 * the outbox event's identity — a replayed event (or the Phase-8
 * outbox processor delivering the same event again) hits the
 * `@@unique([userId, dedupeKey])` constraint and is skipped.
 *
 * The actor never receives a notification for their own action.
 */
@Injectable()
export class TicketNotificationsService {
  private readonly logger = new Logger(TicketNotificationsService.name);

  constructor(private readonly notifications: NotificationsService) {}

  async dispatch(tx: Tx, event: TicketEventEnvelope): Promise<void> {
    const template = TEMPLATES[event.eventType];
    const organizationId = event.organizationId;
    if (!template || !organizationId) return;

    const recipients = await this.resolveRecipients(
      tx,
      event.data.ticketId,
      organizationId,
      template.extraRecipients === 'orgAdmins',
    );

    for (const userId of recipients) {
      // You do not get notified about your own action.
      if (userId === event.actorId) continue;

      await this.notifications.record(tx, {
        userId,
        organizationId,
        type: template.type,
        severity: template.severity,
        title: template.title,
        message: template.message(event.data),
        entityType: 'Ticket',
        entityId: event.data.ticketId,
        actionUrl: `/tickets/${event.data.ticketId}`,
        dedupeKey: `${event.eventType}:${event.data.ticketId}:${userId}`,
      });
    }
  }

  /**
   * Participants of the ticket: requester, creator, assigned
   * agent, verifier and every active assignee. Optionally adds
   * the organization's admins (used for escalations).
   */
  private async resolveRecipients(
    tx: Tx,
    ticketId: string,
    organizationId: string,
    includeAdmins: boolean,
  ): Promise<string[]> {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: {
        requesterId: true,
        createdBy: true,
        assignedAgentId: true,
        verifiedById: true,
        assignments: {
          where: { isActive: true },
          select: { employee: { select: { userId: true } } },
        },
      },
    });

    const ids = new Set<string>();
    if (ticket) {
      if (ticket.requesterId) ids.add(ticket.requesterId);
      if (ticket.createdBy) ids.add(ticket.createdBy);
      if (ticket.assignedAgentId) ids.add(ticket.assignedAgentId);
      if (ticket.verifiedById) ids.add(ticket.verifiedById);
      for (const assignment of ticket.assignments) {
        if (assignment.employee?.userId) {
          ids.add(assignment.employee.userId);
        }
      }
    }

    if (includeAdmins) {
      const admins = await tx.user.findMany({
        where: {
          organizationId,
          isActive: true,
          roles: {
            some: {
              role: {
                name: { in: ['admin', 'superadmin', 'super_admin'] },
              },
            },
          },
        },
        select: { id: true },
        take: 500,
      });
      for (const admin of admins) {
        ids.add(admin.id);
      }
    }

    return [...ids];
  }
}

/**
 * Notification templates per domain event. Events not listed here
 * (ticket.updated, ticket.unassigned, ...) intentionally produce no
 * notification — they are audit-trail facts, not user-facing work.
 */
const TEMPLATES: Record<string, Template> = {
  'ticket.created': {
    type: 'ticket.created',
    severity: 'info',
    title: 'New ticket',
    message: (data) =>
      `Ticket ${data.ticketNumber} was created and needs attention.`,
  },
  'ticket.assigned': {
    type: 'ticket.assigned',
    severity: 'info',
    title: 'Ticket assigned',
    message: (data) => `Ticket ${data.ticketNumber} has been assigned.`,
  },
  'ticket.resolution_submitted': {
    type: 'ticket.resolution_submitted',
    severity: 'info',
    title: 'Resolution submitted',
    message: (data) =>
      `A resolution was submitted for ticket ${data.ticketNumber} and awaits verification.`,
  },
  'ticket.resolution_verified': {
    type: 'ticket.resolved',
    severity: 'success',
    title: 'Ticket resolved',
    message: (data) =>
      `The resolution for ticket ${data.ticketNumber} was verified.`,
  },
  'ticket.resolved': {
    type: 'ticket.resolved',
    severity: 'success',
    title: 'Ticket resolved',
    message: (data) => `Ticket ${data.ticketNumber} is now resolved.`,
  },
  'ticket.resolution_rejected': {
    type: 'ticket.resolution_rejected',
    severity: 'warning',
    title: 'Resolution rejected',
    message: (data) =>
      `The resolution for ticket ${data.ticketNumber} was rejected and sent back to work.`,
  },
  'ticket.reopened': {
    type: 'ticket.reopened',
    severity: 'warning',
    title: 'Ticket reopened',
    message: (data) => `Ticket ${data.ticketNumber} was reopened.`,
  },
  'ticket.closed': {
    type: 'ticket.closed',
    severity: 'success',
    title: 'Ticket closed',
    message: (data) => `Ticket ${data.ticketNumber} was closed.`,
  },
  'ticket.escalated': {
    type: 'ticket.escalated',
    severity: 'warning',
    title: 'Ticket escalated',
    message: (data) =>
      `Ticket ${data.ticketNumber} was escalated to ${
        typeof data.level === 'string' ? data.level : 'a higher level'
      }.`,
    extraRecipients: 'orgAdmins',
  },
  'ticket.comment_added': {
    type: 'ticket.comment_added',
    severity: 'info',
    title: 'New comment',
    message: (data) =>
      `New activity on ticket ${data.ticketNumber}${
        data.isInternal ? ' (internal note)' : ''
      }.`,
  },
  'ticket.attachment_added': {
    type: 'ticket.attachment_added',
    severity: 'info',
    title: 'Attachment added',
    message: (data) =>
      `A new attachment was added to ticket ${data.ticketNumber}.`,
  },
};
