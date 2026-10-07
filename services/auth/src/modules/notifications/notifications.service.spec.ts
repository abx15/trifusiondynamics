import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from './notifications.service';
import { ActorContext } from '../common/auth/actor.decorator';

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

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(NotificationsService);
  });

  describe('record', () => {
    it('creates a notification with defaults', async () => {
      prismaMock.notification.create.mockResolvedValue({
        id: 'n-1',
        severity: 'info',
      } as never);

      const created = await service.record(prismaMock, {
        userId: 'user-1',
        organizationId: 'org-1',
        type: 'ticket.assigned',
        title: 'Ticket assigned',
        message: 'Ticket TFX-1 was assigned.',
      });

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-1',
          type: 'ticket.assigned',
          severity: 'info',
        }),
      });
      expect(created?.id).toBe('n-1');
    });

    it('is idempotent: a duplicate dedupe key returns null', async () => {
      prismaMock.notification.create.mockRejectedValue({
        code: 'P2002',
      });

      const created = await service.record(prismaMock, {
        userId: 'user-1',
        organizationId: 'org-1',
        type: 'ticket.assigned',
        title: 'Ticket assigned',
        message: 'Ticket TFX-1 was assigned.',
        dedupeKey: 'ticket.assigned:ticket-1:user-1',
      });

      expect(created).toBeNull();
    });

    it('re-throws non-unique violations', async () => {
      prismaMock.notification.create.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        service.record(prismaMock as never, {
          userId: 'user-1',
          organizationId: 'org-1',
          type: 'ticket.assigned',
          title: 'Ticket assigned',
          message: 'Ticket TFX-1 was assigned.',
          dedupeKey: 'ticket.assigned:ticket-1:user-1',
        }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('list', () => {
    it('scopes the inbox to the actor user and tenant', async () => {
      prismaMock.notification.count.mockResolvedValue(0);
      prismaMock.notification.findMany.mockResolvedValue([]);

      await service.list(buildActor());

      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', organizationId: 'org-1' },
      });
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', organizationId: 'org-1' },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('filters to unread on request', async () => {
      prismaMock.notification.count.mockResolvedValue(0);
      prismaMock.notification.findMany.mockResolvedValue([]);

      await service.list(buildActor(), { unreadOnly: true });

      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          organizationId: 'org-1',
          isRead: false,
        },
      });
    });
  });

  describe('unreadCount', () => {
    it('counts only the actor unread notifications', async () => {
      prismaMock.notification.count.mockResolvedValue(7);

      const result = await service.unreadCount(buildActor());

      expect(result).toEqual({ count: 7 });
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          organizationId: 'org-1',
          isRead: false,
        },
      });
    });
  });

  describe('markRead', () => {
    it('marks a notification read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.notification.findUniqueOrThrow.mockResolvedValue({
        id: 'n-1',
        isRead: true,
      } as never);

      const updated = await service.markRead(buildActor(), 'n-1');

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'n-1',
          userId: 'user-1',
          organizationId: 'org-1',
          isRead: false,
        },
        data: expect.objectContaining({ isRead: true }),
      });
      expect(updated.id).toBe('n-1');
    });

    it('a notification belonging to another user is a 404', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.markRead(buildActor(), 'someone-elses'),
      ).rejects.toThrow(NotFoundException);
    });

    it('an already-read notification is a client error', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.notification.findFirst.mockResolvedValue({ id: 'n-1' });

      await expect(service.markRead(buildActor(), 'n-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markAllRead', () => {
    it('marks every notification in the actor inbox read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllRead(buildActor());

      expect(result).toEqual({ count: 3 });
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          organizationId: 'org-1',
          isRead: false,
        },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });
});
