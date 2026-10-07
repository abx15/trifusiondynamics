import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxStatus } from '@prisma/client';
import { WebhookDispatcherService } from '../../modules/developer/webhooks/webhook-dispatcher.service';
import { TicketEventsGateway } from '../../gateway/ticket-events.gateway';
import { PrismaService } from '../../modules/database/prisma.service';
import { ActorContext } from '../auth/actor.decorator';
import { NotFoundException } from '@nestjs/common';

function buildActor(overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    userId: 'user-1',
    organizationId: 'org-1',
    roles: [],
    permissions: [],
    isSuperAdmin: false,
    isAdmin: false,
    isAgent: false,
    isClient: false,
    email: 'actor@test.com',
    ...overrides,
  };
}

function buildEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    eventType: 'ticket.assigned',
    payload: {
      eventId: 'evt-1',
      eventType: 'ticket.assigned',
      organizationId: 'org-1',
      correlationId: 'corr-1',
      actorId: 'user-1',
      occurredAt: new Date().toISOString(),
      data: { ticketId: 'ticket-1', ticketNumber: 'TFX-ABC123' },
    },
    status: OutboxStatus.PENDING,
    attempts: 1,
    maxAttempts: 10,
    nextAttemptAt: new Date(),
    lockedAt: new Date(),
    lockedBy: 'processor-1',
    processedAt: null,
    lastError: null,
    organizationId: 'org-1',
    idempotencyKey: 'ticket.assigned:ticket-1',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('OutboxProcessorService', () => {
  let service: OutboxProcessorService;
  let prismaMock: {
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
    outboxEvent: {
      updateMany: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };
  let webhooksMock: { dispatch: jest.Mock };
  let websocketsMock: { publish: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn().mockResolvedValue(0),
      outboxEvent: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn().mockResolvedValue(buildEvent()),
      },
    };
    webhooksMock = { dispatch: jest.fn().mockResolvedValue(undefined) };
    websocketsMock = { publish: jest.fn() };

    service = new OutboxProcessorService(
      prismaMock as unknown as PrismaService,
      webhooksMock as unknown as WebhookDispatcherService,
      websocketsMock as unknown as TicketEventsGateway,
    );
  });

  describe('claimBatch', () => {
    it('claims due events with SKIP LOCKED', async () => {
      const event = buildEvent();
      prismaMock.$queryRaw.mockResolvedValue([event]);

      const claimed = await service.claimBatch(50);

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      const sql = String(prismaMock.$queryRaw.mock.calls[0][0]);
      // The claim must not block behind another
      // worker's open transaction.
      expect(sql).toContain('FOR UPDATE SKIP LOCKED');
      expect(sql).toContain("status = 'PENDING'");
      expect(claimed).toEqual([event]);
    });

    it('returns an empty batch when nothing is due', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);
      expect(await service.claimBatch(50)).toEqual([]);
    });
  });

  describe('recoverStaleLocks', () => {
    it('resets only expired PROCESSING leases', async () => {
      prismaMock.$executeRaw.mockResolvedValue(3);

      const recovered = await service.recoverStaleLocks();

      expect(recovered).toBe(3);
      const sql = String(prismaMock.$executeRaw.mock.calls[0][0]);
      expect(sql).toContain("status = 'PENDING'");
      expect(sql).toContain('lockedAt <');
      // A Date parameter is passed for the cutoff —
      // never string-concatenated.
      const cutoff = prismaMock.$executeRaw.mock.calls[0][1];
      expect(cutoff).toBeInstanceOf(Date);
    });
  });

  describe('processEvent', () => {
    it('delivers to webhooks with the envelope and marks PROCESSED', async () => {
      const event = buildEvent();

      await service.processEvent(event);

      expect(webhooksMock.dispatch).toHaveBeenCalledWith(
        'ticket.assigned',
        event.payload,
        'evt-1',
      );
      expect(websocketsMock.publish).toHaveBeenCalledWith(event.payload);
      expect(prismaMock.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: { id: 'evt-1', status: OutboxStatus.PROCESSING },
        data: expect.objectContaining({
          status: OutboxStatus.PROCESSED,
          processedAt: expect.any(Date),
          lockedAt: null,
          lockedBy: null,
        }),
      });
    });

    it('retries with exponential backoff when delivery fails', async () => {
      const event = buildEvent({ attempts: 1 });
      webhooksMock.dispatch.mockRejectedValue(new Error('webhook down'));
      const before = Date.now();

      await service.processEvent(event);

      expect(prismaMock.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: { id: 'evt-1', status: OutboxStatus.PROCESSING },
        data: expect.objectContaining({
          status: OutboxStatus.PENDING,
          lastError: 'webhook down',
        }),
      });
      const nextAttemptAt = (
        prismaMock.outboxEvent.updateMany.mock.calls[0][0] as {
          data: { nextAttemptAt: Date };
        }
      ).data.nextAttemptAt;
      // First retry: 2s base backoff.
      expect(nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 1_900);
      expect(nextAttemptAt.getTime()).toBeLessThan(before + 60_000);
    });

    it('moves to the dead-letter queue when attempts are exhausted', async () => {
      const event = buildEvent({ attempts: 10, maxAttempts: 10 });
      webhooksMock.dispatch.mockRejectedValue(new Error('poison'));

      await service.processEvent(event);

      expect(prismaMock.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: { id: 'evt-1', status: OutboxStatus.PROCESSING },
        data: expect.objectContaining({
          status: OutboxStatus.DEAD,
          lastError: 'poison',
        }),
      });
      // Never rescheduled.
      expect(
        (
          prismaMock.outboxEvent.updateMany.mock.calls[0][0] as {
            data: Record<string, unknown>;
          }
        ).data.nextAttemptAt,
      ).toBeUndefined();
    });

    it('a failing consumer does not throw out of processEvent', async () => {
      const event = buildEvent();
      webhooksMock.dispatch.mockRejectedValue(new Error('boom'));

      await expect(service.processEvent(event)).resolves.toBeUndefined();
    });
  });

  describe('runOnce', () => {
    it('recovers stale locks, claims and processes each event', async () => {
      const event = buildEvent();
      prismaMock.$executeRaw.mockResolvedValue(1);
      prismaMock.$queryRaw.mockResolvedValue([event]);

      const processed = await service.runOnce();

      expect(prismaMock.$executeRaw).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(webhooksMock.dispatch).toHaveBeenCalledTimes(1);
      expect(processed).toBe(1);
    });

    it('continues the sweep when one event throws', async () => {
      const bad = buildEvent({ id: 'evt-bad' });
      const good = buildEvent({ id: 'evt-good' });
      prismaMock.$queryRaw.mockResolvedValue([bad, good]);
      // The consumer throws synchronously on the first event.
      webhooksMock.dispatch
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(undefined);

      const processed = await service.runOnce();

      expect(processed).toBe(2);
      expect(webhooksMock.dispatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('listDead', () => {
    it('scopes non-superadmin operators to their organization', async () => {
      await service.listDead(buildActor());

      expect(prismaMock.outboxEvent.count).toHaveBeenCalledWith({
        where: { status: OutboxStatus.DEAD, organizationId: 'org-1' },
      });
      expect(prismaMock.outboxEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: OutboxStatus.DEAD,
            organizationId: 'org-1',
          },
        }),
      );
    });

    it('super admins see every tenant dead-letter', async () => {
      await service.listDead(buildActor({ isSuperAdmin: true }));

      expect(prismaMock.outboxEvent.count).toHaveBeenCalledWith({
        where: { status: OutboxStatus.DEAD },
      });
    });
  });

  describe('retry', () => {
    it('returns a dead event to PENDING with a fresh attempt budget', async () => {
      prismaMock.outboxEvent.findFirst.mockResolvedValue(buildEvent());
      prismaMock.outboxEvent.findUniqueOrThrow.mockResolvedValue(
        buildEvent({ status: OutboxStatus.PENDING, attempts: 0 }),
      );

      const result = await service.retry(buildActor(), 'evt-1');

      expect(prismaMock.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: { id: 'evt-1', status: OutboxStatus.DEAD },
        data: expect.objectContaining({
          status: OutboxStatus.PENDING,
          attempts: 0,
          nextAttemptAt: expect.any(Date),
        }),
      });
      expect(result.status).toBe(OutboxStatus.PENDING);
    });

    it('a dead event from another organization is a 404', async () => {
      prismaMock.outboxEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.retry(buildActor(), 'other-org-event'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
