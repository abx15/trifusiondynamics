import { Tx } from '../../../common/prisma/unit-of-work.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TicketNotificationsService } from './ticket-notifications.service';

function createFakeTx(
  ticket: Record<string, unknown> | null,
  admins: Array<{ id: string }> = [],
) {
  return {
    ticket: {
      findUnique: jest.fn().mockResolvedValue(ticket),
    },
    user: {
      findMany: jest.fn().mockResolvedValue(admins),
    },
  } as unknown as Tx;
}

function createService() {
  const notifications = {
    record: jest.fn().mockResolvedValue(null),
  };
  const service = new TicketNotificationsService(
    notifications as unknown as NotificationsService,
  );
  return { service, notifications };
}

const TICKET = {
  requesterId: 'user-requester',
  createdBy: 'user-creator',
  assignedAgentId: 'user-agent',
  verifiedById: null,
  assignments: [{ employee: { userId: 'user-assignee' } }],
};

describe('TicketNotificationsService', () => {
  it('notifies every participant of a new ticket', async () => {
    const { service, notifications } = createService();
    const tx = createFakeTx(TICKET);

    await service.dispatch(tx, {
      eventType: 'ticket.created',
      organizationId: 'org-1',
      actorId: 'user-staff',
      data: { ticketId: 'ticket-1', ticketNumber: 'TFX-ABC123' },
    });

    const recipients = notifications.record.mock.calls.map(
      (call: unknown[]) => (call[1] as { userId: string }).userId,
    );
    expect(recipients.sort()).toEqual([
      'user-agent',
      'user-assignee',
      'user-creator',
      'user-requester',
    ]);
  });

  it('never notifies the actor for their own action', async () => {
    const { service, notifications } = createService();
    const tx = createFakeTx(TICKET);

    await service.dispatch(tx, {
      eventType: 'ticket.assigned',
      organizationId: 'org-1',
      actorId: 'user-requester',
      data: { ticketId: 'ticket-1', ticketNumber: 'TFX-ABC123' },
    });

    const recipients = notifications.record.mock.calls.map(
      (call: unknown[]) => (call[1] as { userId: string }).userId,
    );
    expect(recipients).not.toContain('user-requester');
    expect(recipients).toContain('user-agent');
  });

  it('escalations also reach the organization admins', async () => {
    const { service, notifications } = createService();
    const tx = createFakeTx(TICKET, [{ id: 'user-admin' }]);

    await service.dispatch(tx, {
      eventType: 'ticket.escalated',
      organizationId: 'org-1',
      actorId: 'user-staff',
      data: {
        ticketId: 'ticket-1',
        ticketNumber: 'TFX-ABC123',
        level: 'SUPER_ADMIN',
      },
    });

    const recipients = notifications.record.mock.calls.map(
      (call: unknown[]) => (call[1] as { userId: string }).userId,
    );
    expect(recipients).toContain('user-admin');
    // Only the escalation template pulls in admins.
    expect(tx.user.findMany).toHaveBeenCalled();
  });

  it('non-escalation events do not query admins', async () => {
    const { service } = createService();
    const tx = createFakeTx(TICKET);

    await service.dispatch(tx, {
      eventType: 'ticket.created',
      organizationId: 'org-1',
      actorId: 'user-staff',
      data: { ticketId: 'ticket-1', ticketNumber: 'TFX-ABC123' },
    });

    expect(tx.user.findMany).not.toHaveBeenCalled();
  });

  it('unknown event types produce no notifications', async () => {
    const { service, notifications } = createService();
    const tx = createFakeTx(TICKET);

    await service.dispatch(tx, {
      eventType: 'ticket.updated',
      organizationId: 'org-1',
      actorId: 'user-staff',
      data: { ticketId: 'ticket-1', ticketNumber: 'TFX-ABC123' },
    });

    expect(notifications.record).not.toHaveBeenCalled();
  });

  it('events without a tenant produce no notifications', async () => {
    const { service, notifications } = createService();
    const tx = createFakeTx(TICKET);

    await service.dispatch(tx, {
      eventType: 'ticket.created',
      organizationId: null,
      actorId: 'user-staff',
      data: { ticketId: 'ticket-1', ticketNumber: 'TFX-ABC123' },
    });

    expect(notifications.record).not.toHaveBeenCalled();
  });

  it('builds an idempotent dedupe key per recipient', async () => {
    const { service, notifications } = createService();
    const tx = createFakeTx(TICKET);

    await service.dispatch(tx, {
      eventType: 'ticket.closed',
      organizationId: 'org-1',
      actorId: 'user-staff',
      data: { ticketId: 'ticket-1', ticketNumber: 'TFX-ABC123' },
    });

    const entry = notifications.record.mock.calls[0][1] as {
      dedupeKey: string;
      entityType: string;
      entityId: string;
      actionUrl: string;
      organizationId: string;
      severity: string;
      type: string;
    };
    expect(entry.dedupeKey).toBe('ticket.closed:ticket-1:user-requester');
    expect(entry.entityType).toBe('Ticket');
    expect(entry.entityId).toBe('ticket-1');
    expect(entry.actionUrl).toBe('/tickets/ticket-1');
    expect(entry.organizationId).toBe('org-1');
    expect(entry.severity).toBe('success');
    expect(entry.type).toBe('ticket.closed');
  });

  it('classifies rejected resolutions as warnings', async () => {
    const { service, notifications } = createService();
    const tx = createFakeTx(TICKET);

    await service.dispatch(tx, {
      eventType: 'ticket.resolution_rejected',
      organizationId: 'org-1',
      actorId: 'user-agent',
      data: { ticketId: 'ticket-1', ticketNumber: 'TFX-ABC123' },
    });

    const entry = notifications.record.mock.calls[0][1] as {
      severity: string;
      type: string;
    };
    expect(entry.severity).toBe('warning');
    expect(entry.type).toBe('ticket.resolution_rejected');
  });

  it('marks internal notes in the comment message', async () => {
    const { service, notifications } = createService();
    const tx = createFakeTx(TICKET);

    await service.dispatch(tx, {
      eventType: 'ticket.comment_added',
      organizationId: 'org-1',
      actorId: 'user-staff',
      data: {
        ticketId: 'ticket-1',
        ticketNumber: 'TFX-ABC123',
        isInternal: true,
      },
    });

    const entry = notifications.record.mock.calls[0][1] as {
      message: string;
    };
    expect(entry.message).toContain('internal note');
  });
});
