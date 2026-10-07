import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActorContext } from '../../../common/auth/actor.decorator';
import {
  TicketAuthorizationService,
  TicketWithAccess,
} from './ticket-authorization.service';
import { TICKET_PERMISSIONS } from '../../../common/auth/ticket-permissions';

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

function buildTicket(
  overrides: Partial<TicketWithAccess> = {},
): TicketWithAccess {
  return {
    id: 'ticket-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    projectId: null,
    departmentId: null,
    requesterId: 'user-1',
    requesterEmployeeId: null,
    assignedAgentId: 'user-2',
    status: 'OPEN',
    type: 'CLIENT_SUPPORT',
    priority: 'MEDIUM',
    escalationLevel: 'NONE',
    closedById: null,
    verifiedById: null,
    createdBy: 'user-1',
    assignments: [],
    ...overrides,
  };
}

describe('TicketAuthorizationService', () => {
  let service: TicketAuthorizationService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketAuthorizationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(TicketAuthorizationService);
  });

  describe('loadVisibleTicket — tenant isolation', () => {
    it('always scopes the lookup to the actor organization', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(buildTicket());

      await service.loadVisibleTicket(buildActor(), 'ticket-1');

      expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith({
        where: { id: 'ticket-1', organizationId: 'org-1' },
        select: expect.any(Object),
      });
    });

    it('reports a foreign-tenant ticket as 404, not 403', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);

      await expect(
        service.loadVisibleTicket(buildActor(), 'other-org-ticket'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveAccess — capability derivation', () => {
    it('derives capabilities from live roles and assignments', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        departmentId: null,
      });
      const ticket = buildTicket({
        requesterId: 'user-1',
        assignments: [
          {
            employeeId: 'emp-1',
            type: 'PRIMARY',
            isActive: true,
            employee: { userId: 'user-1', departmentId: null },
          },
        ],
      });

      const access = await service.resolveAccess(
        buildActor({ isAgent: true }),
        ticket,
      );

      expect(access.capabilities).toEqual(
        expect.arrayContaining(['agent', 'assignee', 'requester']),
      );
      expect(access.isPrimaryAssignee).toBe(true);
      expect(access.isRequester).toBe(true);
    });

    it('ignores inactive assignments', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        departmentId: null,
      });
      const ticket = buildTicket({
        assignments: [
          {
            employeeId: 'emp-1',
            type: 'PRIMARY',
            isActive: false,
            employee: { userId: 'user-1', departmentId: null },
          },
        ],
      });

      const access = await service.resolveAccess(buildActor(), ticket);

      expect(access.isAssignee).toBe(false);
      expect(access.capabilities).not.toContain('assignee');
    });

    it('a client only owns tickets attached to their linked client', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(null);
      const ticket = buildTicket({
        requesterId: 'user-9',
        clientId: 'client-1',
      });

      const own = await service.resolveAccess(
        buildActor({ isClient: true, linkedClientId: 'client-1' }),
        ticket,
      );
      // Access is granted via client ownership, not via the
      // capability list: the actor did not raise the ticket.
      expect(own.isOwnClient).toBe(true);
      expect(own.isRequester).toBe(false);
      expect(own.capabilities).toEqual([]);

      const other = await service.resolveAccess(
        buildActor({
          isClient: true,
          linkedClientId: 'client-2',
          userId: 'user-1',
        }),
        buildTicket({ requesterId: 'user-9', clientId: 'client-1' }),
      );
      expect(other.isOwnClient).toBe(false);
      expect(other.capabilities).toEqual([]);
    });
  });

  describe('assertCanRead', () => {
    it('staff roles can read anything in the tenant', async () => {
      const access = {
        ticket: buildTicket(),
        capabilities: [],
        employeeId: null,
        isAssignee: false,
        isPrimaryAssignee: false,
        isRequester: false,
        isOwnClient: false,
      };
      await expect(
        service.assertCanRead(buildActor({ isAdmin: true }), access as never),
      ).resolves.toBeUndefined();
    });

    it('the requester can read their own ticket', async () => {
      const access = {
        ticket: buildTicket(),
        capabilities: [],
        employeeId: null,
        isAssignee: false,
        isPrimaryAssignee: false,
        isRequester: true,
        isOwnClient: false,
      };
      await expect(
        service.assertCanRead(buildActor(), access as never),
      ).resolves.toBeUndefined();
    });

    it('an assignee can read the ticket they are assigned to', async () => {
      const access = {
        ticket: buildTicket(),
        capabilities: [],
        employeeId: null,
        isAssignee: true,
        isPrimaryAssignee: false,
        isRequester: false,
        isOwnClient: false,
      };
      await expect(
        service.assertCanRead(buildActor(), access as never),
      ).resolves.toBeUndefined();
    });

    it('a client can only read their own client tickets', async () => {
      const access = {
        ticket: buildTicket(),
        capabilities: [],
        employeeId: null,
        isAssignee: false,
        isPrimaryAssignee: false,
        isRequester: false,
        isOwnClient: false,
      };
      await expect(
        service.assertCanRead(
          buildActor({ isClient: true, linkedClientId: 'client-2' }),
          access as never,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('a plain employee without a relationship is denied', async () => {
      const access = {
        ticket: buildTicket({ requesterId: 'user-9' }),
        capabilities: [],
        employeeId: null,
        isAssignee: false,
        isPrimaryAssignee: false,
        isRequester: false,
        isOwnClient: false,
      };
      await expect(
        service.assertCanRead(buildActor(), access as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verification', () => {
    const access = {
      ticket: buildTicket(),
      capabilities: [],
      employeeId: null,
      isAssignee: false,
      isPrimaryAssignee: false,
      isRequester: false,
      isOwnClient: false,
    };

    it('clients are routed to confirm/reopen instead of verifying', async () => {
      await expect(
        service.assertCanVerifyResolution(
          buildActor({ isClient: true }),
          access as never,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('an assignee cannot verify their own resolution', async () => {
      await expect(
        service.assertCanVerifyResolution(buildActor(), {
          ...access,
          isAssignee: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('agents and admins may verify', async () => {
      await expect(
        service.assertCanVerifyResolution(
          buildActor({ isAgent: true }),
          access as never,
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('closure', () => {
    it('an unconfirmed CLIENT_SUPPORT ticket forces the override path', async () => {
      const access = {
        ticket: buildTicket({
          type: 'CLIENT_SUPPORT' as never,
          clientConfirmed: false,
        }),
        capabilities: [],
        employeeId: null,
        isAssignee: false,
        isPrimaryAssignee: false,
        isRequester: false,
        isOwnClient: false,
      };
      const { requiresOverride } = await service.assertCanClose(
        buildActor({ isAgent: true }),
        access,
      );
      expect(requiresOverride).toBe(true);
    });

    it('the requester may close without the override', async () => {
      const access = {
        ticket: buildTicket({
          type: 'CLIENT_SUPPORT' as never,
          clientConfirmed: false,
        }),
        capabilities: [],
        employeeId: null,
        isAssignee: false,
        isPrimaryAssignee: false,
        isRequester: true,
        isOwnClient: false,
      };
      const { requiresOverride } = await service.assertCanClose(
        buildActor(),
        access,
      );
      expect(requiresOverride).toBe(false);
    });

    it('close override demands the dedicated permission', () => {
      expect(() =>
        service.assertCanOverrideClose(buildActor({ permissions: [] })),
      ).toThrow(ForbiddenException);
      expect(() =>
        service.assertCanOverrideClose(
          buildActor({
            permissions: [TICKET_PERMISSIONS.CLOSE_OVERRIDE],
          }),
        ),
      ).not.toThrow();
      expect(() =>
        service.assertCanOverrideClose(buildActor({ isSuperAdmin: true })),
      ).not.toThrow();
    });
  });

  describe('internal notes', () => {
    it('clients can never post internal notes', () => {
      expect(() =>
        service.assertCanCommentInternal(buildActor({ isClient: true })),
      ).toThrow(ForbiddenException);
    });

    it('staff need the comment_internal permission', () => {
      expect(() =>
        service.assertCanCommentInternal(buildActor({ permissions: [] })),
      ).toThrow(ForbiddenException);
      expect(() =>
        service.assertCanCommentInternal(
          buildActor({
            permissions: [TICKET_PERMISSIONS.COMMENT_INTERNAL],
          }),
        ),
      ).not.toThrow();
      expect(() =>
        service.assertCanCommentInternal(buildActor({ isSuperAdmin: true })),
      ).not.toThrow();
    });
  });

  describe('assignment', () => {
    it('only staff may assign', async () => {
      await expect(service.assertCanAssign(buildActor())).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.assertCanAssign(buildActor({ isAgent: true })),
      ).resolves.toBeUndefined();
    });
  });

  describe('resolveParticipantIds', () => {
    it('collects requester, creator, agent, verifier and assignees', async () => {
      // The query filters to active assignments, so the mock
      // only ever sees those.
      prismaMock.ticket.findUnique.mockResolvedValue({
        requesterId: 'user-1',
        assignedAgentId: 'user-2',
        createdBy: 'user-3',
        verifiedById: 'user-4',
        assignments: [
          {
            isActive: true,
            employee: { userId: 'user-5' },
          },
          {
            isActive: true,
            employee: { userId: 'user-5' }, // duplicate collapses
          },
        ],
      } as never);

      const ids = await service.resolveParticipantIds('ticket-1');

      expect(ids.sort()).toEqual([
        'user-1',
        'user-2',
        'user-3',
        'user-4',
        'user-5',
      ]);
    });

    it('returns an empty list for an unknown ticket', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);
      expect(await service.resolveParticipantIds('nope')).toEqual([]);
    });
  });
});
