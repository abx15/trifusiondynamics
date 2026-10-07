import { SlaMonitorJob } from './sla-monitor.job';
import { SlaEngineService } from './sla-engine.service';
import { EscalationLevel, TicketPriority, TicketStatus } from '@prisma/client';
import { Tx } from '../../../common/prisma/unit-of-work.service';

const MIN = 60_000;
const T0 = new Date('2026-01-01T00:00:00Z').getTime();

function buildTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    organizationId: 'org-1',
    ticketNumber: 'TFX-ABC123',
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.HIGH,
    createdAt: new Date(T0),
    firstResponseDeadline: new Date(T0 + 30 * MIN),
    firstRespondedAt: null,
    slaResponseWarnedAt: null,
    slaResponseBreachedAt: null,
    resolutionDeadline: new Date(T0 + 120 * MIN),
    resolvedAt: null,
    slaResolutionWarnedAt: null,
    slaResolutionBreachedAt: null,
    slaPausedAt: null,
    totalPausedDurationMs: 0n,
    assignedAgentId: 'user-2',
    departmentId: null,
    escalationLevel: EscalationLevel.NONE,
    ...overrides,
  };
}

describe('SlaMonitorJob', () => {
  let job: SlaMonitorJob;
  let prismaMock: { ticket: { findMany: jest.Mock } };
  let txMock: {
    ticket: {
      updateMany: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    ticketEscalation: { create: jest.Mock };
  };
  let uowMock: { run: jest.Mock };
  let outboxMock: { publish: jest.Mock };
  let auditMock: { recordSystem: jest.Mock };
  let notificationsMock: { record: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(T0));

    prismaMock = { ticket: { findMany: jest.fn() } };
    txMock = {
      ticket: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          firstResponseDeadline: new Date(T0 + 30 * MIN),
          resolutionDeadline: new Date(T0 + 120 * MIN),
        }),
      },
      ticketEscalation: { create: jest.fn().mockResolvedValue({}) },
    };
    uowMock = {
      run: jest.fn((callback: (tx: Tx) => Promise<unknown>) =>
        callback(txMock as unknown as Tx),
      ),
    };
    outboxMock = {
      publish: jest.fn().mockResolvedValue({ eventId: 'evt-1' }),
    };
    auditMock = {
      recordSystem: jest.fn().mockResolvedValue(undefined),
    };
    notificationsMock = {
      record: jest.fn().mockResolvedValue(null),
    };

    job = new SlaMonitorJob(
      prismaMock as never,
      uowMock as never,
      new SlaEngineService(),
      outboxMock as never,
      auditMock as never,
      notificationsMock as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('only scans active, unpaused tickets that carry a deadline', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([]);

    await job.scan();

    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slaPausedAt: null,
          status: { in: expect.any(Array) },
          OR: [
            { firstResponseDeadline: { not: null } },
            { resolutionDeadline: { not: null } },
          ],
        }),
        take: expect.any(Number),
      }),
    );
  });

  it('raises a response breach once the deadline passes', async () => {
    const ticket = buildTicket();
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    // 31 minutes in: the 30-minute response SLA is breached,
    // but the 120-minute resolution clock is only 26% elapsed.
    jest.setSystemTime(new Date(T0 + 31 * MIN));

    await job.scan();

    expect(txMock.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 'ticket-1', slaResponseBreachedAt: null },
      data: { slaResponseBreachedAt: new Date(T0 + 31 * MIN) },
    });
    expect(outboxMock.publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'sla.response_breached',
        organizationId: 'org-1',
      }),
    );
    // The assigned agent is notified in the same transaction.
    expect(notificationsMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-2',
        organizationId: 'org-1',
        type: 'sla.response_breach',
        severity: 'warning',
        entityType: 'Ticket',
        entityId: 'ticket-1',
        dedupeKey: 'sla-response-breach:ticket-1',
      }),
    );
    expect(auditMock.recordSystem).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'ticket.sla_breached',
        entityId: 'ticket-1',
      }),
    );
  });

  it('raises a warning at 80% of the ACTIVE window', async () => {
    // Response clock already stopped; 100 of 120 resolution
    // minutes (83%) have elapsed.
    const ticket = buildTicket({
      firstRespondedAt: new Date(T0 + 1 * MIN),
    });
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    jest.setSystemTime(new Date(T0 + 100 * MIN));

    await job.scan();

    expect(txMock.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 'ticket-1', slaResolutionWarnedAt: null },
      data: { slaResolutionWarnedAt: new Date(T0 + 100 * MIN) },
    });
    expect(outboxMock.publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'sla.resolution_warning',
      }),
    );
    expect(notificationsMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-2',
        type: 'sla.resolution_warning',
        severity: 'warning',
        dedupeKey: 'sla-resolution-warning:ticket-1',
      }),
    );
  });

  it('notifies nobody when the ticket has no assigned agent', async () => {
    const ticket = buildTicket({
      assignedAgentId: null,
      departmentId: null,
    });
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    jest.setSystemTime(new Date(T0 + 31 * MIN));

    await job.scan();

    expect(outboxMock.publish).toHaveBeenCalledTimes(1);
    expect(notificationsMock.record).not.toHaveBeenCalled();
  });

  it('does not warn a ticket whose pauses push active time below 80%', async () => {
    // 60 min of folded pauses: at T0+100min only 40 of 120
    // active minutes (33%) have elapsed.
    const ticket = buildTicket({
      firstRespondedAt: new Date(T0 + 1 * MIN),
      totalPausedDurationMs: BigInt(60 * MIN),
    });
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    jest.setSystemTime(new Date(T0 + 100 * MIN));

    await job.scan();

    expect(txMock.ticket.updateMany).not.toHaveBeenCalled();
    expect(outboxMock.publish).not.toHaveBeenCalled();
  });

  it('records each warning and breach at most once', async () => {
    const ticket = buildTicket({
      slaResponseWarnedAt: new Date(T0 + 25 * MIN),
      slaResponseBreachedAt: new Date(T0 + 31 * MIN),
      slaResolutionWarnedAt: new Date(T0 + 100 * MIN),
      slaResolutionBreachedAt: new Date(T0 + 121 * MIN),
    });
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    jest.setSystemTime(new Date(T0 + 200 * MIN));

    await job.scan();

    // Both clocks already recorded their outcomes: the
    // conditional writes match nothing and no events fire.
    expect(txMock.ticket.updateMany).not.toHaveBeenCalled();
    expect(outboxMock.publish).not.toHaveBeenCalled();
  });

  it('escalates a critical resolution breach to Super Admin', async () => {
    // 120-minute resolution deadline, breached 61 minutes ago.
    const ticket = buildTicket({
      firstRespondedAt: new Date(T0 + 1 * MIN),
    });
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    jest.setSystemTime(new Date(T0 + 181 * MIN));

    await job.scan();

    expect(txMock.ticketEscalation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: 'ticket-1',
        level: EscalationLevel.SUPER_ADMIN,
        trigger: 'SLA_CRITICAL_BREACH',
      }),
    });
    expect(txMock.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: expect.objectContaining({
        escalationLevel: EscalationLevel.SUPER_ADMIN,
      }),
    });
    expect(outboxMock.publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'sla.resolution_breached',
      }),
    );
    // A critical breach is surfaced with critical severity.
    expect(notificationsMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-2',
        type: 'sla.resolution_breach',
        severity: 'critical',
        dedupeKey: 'sla-resolution-breach:ticket-1',
      }),
    );
  });

  it('does not escalate a breach under the critical window', async () => {
    // Resolution deadline T0+120min, now T0+150min: 30 min
    // overdue, under the 60-minute critical threshold.
    const ticket = buildTicket({
      firstRespondedAt: new Date(T0 + 1 * MIN),
      slaResolutionWarnedAt: new Date(T0 + 100 * MIN),
    });
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    jest.setSystemTime(new Date(T0 + 150 * MIN));

    await job.scan();

    expect(outboxMock.publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'sla.resolution_breached',
      }),
    );
    expect(txMock.ticketEscalation.create).not.toHaveBeenCalled();
    expect(txMock.ticket.update).not.toHaveBeenCalled();
  });

  it('never escalates on a response breach, only a resolution breach', async () => {
    // Response SLA breached by 61 minutes (critical by time),
    // but only the RESOLUTION clock may escalate.
    const ticket = buildTicket();
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    // T0+91min: response 61 min overdue; resolution at 76% —
    // not warned, not breached.
    jest.setSystemTime(new Date(T0 + 91 * MIN));

    await job.scan();

    expect(outboxMock.publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'sla.response_breached',
      }),
    );
    expect(txMock.ticketEscalation.create).not.toHaveBeenCalled();
  });

  it('a failing ticket does not stop the sweep', async () => {
    const bad = buildTicket({ id: 'ticket-bad' });
    const good = buildTicket({ id: 'ticket-good' });
    prismaMock.ticket.findMany.mockResolvedValue([bad, good]);
    jest.setSystemTime(new Date(T0 + 31 * MIN));

    // The conditional write for the first ticket blows up; the
    // second must still be processed.
    txMock.ticket.updateMany
      .mockRejectedValueOnce(new Error('db hiccup'))
      .mockResolvedValue({ count: 1 });

    await job.scan();

    expect(outboxMock.publish).toHaveBeenCalledTimes(1);
    expect(outboxMock.publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({ ticketId: 'ticket-good' }),
      }),
    );
  });

  it('ignores tickets whose clocks have already stopped', async () => {
    const resolved = buildTicket({
      firstRespondedAt: new Date(T0 + 5 * MIN),
      resolvedAt: new Date(T0 + 60 * MIN),
      status: TicketStatus.RESOLVED,
    });
    prismaMock.ticket.findMany.mockResolvedValue([resolved]);
    jest.setSystemTime(new Date(T0 + 200 * MIN));

    await job.scan();

    expect(txMock.ticket.updateMany).not.toHaveBeenCalled();
    expect(outboxMock.publish).not.toHaveBeenCalled();
  });
});
