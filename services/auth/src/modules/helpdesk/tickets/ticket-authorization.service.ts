import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Ticket, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActorContext } from '../../../common/auth/actor.decorator';
import { TICKET_PERMISSIONS } from '../../../common/auth/ticket-permissions';
import type { TicketCapability } from './ticket-state-machine';

/** Relations needed to decide access, fetched in one round trip. */
export type TicketWithAccess = Ticket & {
  assignments?: Array<{
    employeeId: string;
    type: string;
    isActive: boolean;
    employee: { userId: string; departmentId: string | null } | null;
  }>;
  _count?: { comments: number; attachments: number };
};

export interface TicketAccessContext {
  ticket: TicketWithAccess;
  capabilities: TicketCapability[];
  /** Employee record for the actor, if they have one. */
  employeeId: string | null;
  /** True when the actor is an active assignee (primary or supporting). */
  isAssignee: boolean;
  isPrimaryAssignee: boolean;
  /** True when the actor raised the ticket. */
  isRequester: boolean;
  /** True when the actor's client owns the ticket. */
  isOwnClient: boolean;
}

const ACCESS_SELECT = {
  id: true,
  organizationId: true,
  clientId: true,
  projectId: true,
  departmentId: true,
  requesterId: true,
  requesterEmployeeId: true,
  assignedAgentId: true,
  status: true,
  type: true,
  priority: true,
  escalationLevel: true,
  closedById: true,
  verifiedById: true,
  createdBy: true,
  assignments: {
    where: { isActive: true },
    select: {
      employeeId: true,
      type: true,
      isActive: true,
      employee: { select: { userId: true, departmentId: true } },
    },
  },
} satisfies Prisma.TicketSelect;

@Injectable()
export class TicketAuthorizationService {
  private readonly logger = new Logger(TicketAuthorizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads a ticket that the actor is allowed to know EXISTS.
   *
   * Tenant isolation comes first: the query is always constrained by the
   * actor's JWT-derived organizationId, so a ticket id belonging to another
   * organization is reported as 404 rather than 403 — an outsider must not be
   * able to distinguish "exists but forbidden" from "does not exist".
   */
  async loadVisibleTicket(
    actor: ActorContext,
    ticketId: string,
  ): Promise<TicketWithAccess> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, organizationId: actor.organizationId },
      select: ACCESS_SELECT,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket as TicketWithAccess;
  }

  /**
   * Builds the access context for a ticket: who is the actor in relation to it,
   * and which lifecycle capabilities they hold.
   *
   * Capabilities are derived from LIVE data — the actor's roles/permissions from
   * the JWT and the ticket's actual assignment/ownership rows. The stored
   * `requesterRoleSnapshot` is never consulted.
   */
  async resolveAccess(
    actor: ActorContext,
    ticket: TicketWithAccess,
  ): Promise<TicketAccessContext> {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: actor.userId },
      select: { id: true, departmentId: true },
    });

    // Defense in depth: the query in loadVisibleTicket already filters
    // to active rows, but resolveAccess must not TRUST that. If it is
    // ever handed a ticket loaded another way (e.g. the full history
    // include in findOne), inactive rows must never grant capabilities.
    const activeAssignments = (ticket.assignments ?? []).filter(
      (assignment) => assignment.isActive,
    );
    const isAssignee = employee
      ? activeAssignments.some((a) => a.employeeId === employee.id)
      : false;
    const isPrimaryAssignee = employee
      ? activeAssignments.some(
          (a) => a.employeeId === employee.id && a.type === 'PRIMARY',
        )
      : false;

    const isRequester = ticket.requesterId === actor.userId;

    // A client only ever sees tickets attached to their own Client record. This
    // is the cross-client isolation boundary; it is evaluated on the server for
    // every read, not just in the UI.
    const isOwnClient =
      actor.isClient && !!actor.linkedClientId === true
        ? ticket.clientId === actor.linkedClientId
        : false;

    const capabilities: TicketCapability[] = [];

    if (actor.isSuperAdmin) capabilities.push('superAdmin');
    if (actor.isAdmin) capabilities.push('admin');
    if (actor.isAgent) capabilities.push('agent');
    if (isAssignee) capabilities.push('assignee');
    if (isRequester) capabilities.push('requester');

    // Admin/agent roles come from the JWT's live roles. A role string alone is
    // not enough: the PermissionsGuard has already verified the coarse action
    // permission before we get here.
    return {
      ticket,
      capabilities,
      employeeId: employee?.id ?? null,
      isAssignee,
      isPrimaryAssignee,
      isRequester,
      isOwnClient,
    };
  }

  /**
   * Read access.
   *
   * - Super admin: platform-wide, but still inside a tenant unless the caller
   *   explicitly queries across tenants (a separate, separately-authorized path).
   * - Admin / agent: any ticket in their organization.
   * - Employee: tickets they raised, or tickets they are actively assigned to.
   * - Client: only tickets whose clientId matches their linked client.
   *
   * Everyone else gets 403.
   */
  async assertCanRead(
    actor: ActorContext,
    access: TicketAccessContext,
  ): Promise<void> {
    if (actor.isSuperAdmin || actor.isAdmin || actor.isAgent) return;
    if (access.isRequester) return;
    if (access.isAssignee) return;
    if (access.isOwnClient) return;

    throw new ForbiddenException('You do not have access to this ticket');
  }

  /** Internal comments are never visible to clients. */
  async assertCanReadInternalNotes(
    actor: ActorContext,
    access: TicketAccessContext,
  ): Promise<void> {
    if (actor.isClient) {
      throw new ForbiddenException(
        'Internal notes are not available to client users',
      );
    }
    await this.assertCanRead(actor, access);
  }

  /**
   * Only staff holding the dedicated `helpdesk:comment_internal`
   * permission may post internal notes. Clients never can, and
   * neither can staff without the grant — the permission string is
   * the RBAC boundary, not just the role check.
   */
  assertCanCommentInternal(actor: ActorContext): void {
    if (actor.isClient) {
      throw new ForbiddenException('Client users cannot create internal notes');
    }
    if (
      !actor.isSuperAdmin &&
      !actor.permissions.includes(TICKET_PERMISSIONS.COMMENT_INTERNAL)
    ) {
      throw new ForbiddenException(
        'Creating internal notes requires the helpdesk:comment_internal permission',
      );
    }
  }

  /**
   * Assignment is an agent/admin concern. Employees cannot assign work, not even
   * to themselves.
   */
  async assertCanAssign(actor: ActorContext): Promise<void> {
    if (actor.isSuperAdmin || actor.isAdmin || actor.isAgent) return;
    throw new ForbiddenException('You are not allowed to assign tickets');
  }

  /**
   * Resolution submission: the assignee submits. Agents/admins may also submit
   * on their own behalf, but an employee can only submit for a ticket they are
   * actively assigned to — this is what stops an employee from resolving
   * arbitrary tickets by guessing an id.
   */
  async assertCanSubmitResolution(
    actor: ActorContext,
    access: TicketAccessContext,
  ): Promise<void> {
    if (actor.isSuperAdmin || actor.isAdmin || actor.isAgent) return;
    if (access.isAssignee) return;
    throw new ForbiddenException(
      'Only an assignee can submit a resolution for this ticket',
    );
  }

  /**
   * Verification: agents, admins and super admins only. An assignee can never
   * verify their own resolution, and neither can a client.
   */
  async assertCanVerifyResolution(
    actor: ActorContext,
    access: TicketAccessContext,
  ): Promise<void> {
    if (actor.isClient) {
      throw new ForbiddenException(
        'Clients cannot verify resolutions; use the confirm/reopen actions instead',
      );
    }
    if (actor.isSuperAdmin || actor.isAdmin || actor.isAgent) return;
    throw new ForbiddenException(
      'Only agents or administrators can verify a resolution',
    );
  }

  /**
   * Closure.
   *
   * For CLIENT_SUPPORT tickets the requester must confirm first. Staff cannot
   * close such a ticket outright — they must use the override endpoint, which
   * demands a reason, writes an audit record and notifies the client.
   */
  async assertCanClose(
    actor: ActorContext,
    access: TicketAccessContext,
  ): Promise<{ requiresOverride: boolean }> {
    const { ticket } = access;

    if (ticket.type === 'CLIENT_SUPPORT' && !ticket.clientConfirmed) {
      if (access.isRequester) {
        return { requiresOverride: false };
      }
      // Staff must take the explicit override path.
      return { requiresOverride: true };
    }

    if (
      actor.isSuperAdmin ||
      actor.isAdmin ||
      actor.isAgent ||
      access.isRequester
    ) {
      return { requiresOverride: false };
    }

    throw new ForbiddenException('You are not allowed to close this ticket');
  }

  /** Closing on behalf of a client requires the dedicated override permission. */
  assertCanOverrideClose(actor: ActorContext): void {
    if (
      actor.permissions.includes('helpdesk:close_override') ||
      actor.isSuperAdmin
    ) {
      return;
    }
    throw new ForbiddenException(
      'Closing a client ticket before client confirmation requires the helpdesk:close_override permission',
    );
  }

  /** Reopening a client ticket is the requester's right; staff may also reopen. */
  async assertCanReopen(
    actor: ActorContext,
    access: TicketAccessContext,
  ): Promise<void> {
    if (access.isRequester) return;
    if (actor.isSuperAdmin || actor.isAdmin || actor.isAgent) return;
    if (
      access.isAssignee &&
      access.ticket.status === TicketStatus.UNDER_VERIFICATION
    ) {
      // An assignee may flag that the fix did not hold, but only while it is
      // still awaiting verification.
      return;
    }
    throw new ForbiddenException('You are not allowed to reopen this ticket');
  }

  /** Manual escalation requires a staff role. */
  assertCanEscalate(actor: ActorContext): void {
    if (actor.isSuperAdmin || actor.isAdmin || actor.isAgent) return;
    throw new ForbiddenException('You are not allowed to escalate tickets');
  }

  /**
   * The full participant set for realtime fan-out and notifications. Only these
   * users may receive ticket-scoped events.
   */
  async resolveParticipantIds(ticketId: string): Promise<string[]> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        requesterId: true,
        assignedAgentId: true,
        createdBy: true,
        verifiedById: true,
        assignments: {
          where: { isActive: true },
          select: { employee: { select: { userId: true } } },
        },
      },
    });

    if (!ticket) return [];

    const ids = new Set<string>();
    if (ticket.requesterId) ids.add(ticket.requesterId);
    if (ticket.createdBy) ids.add(ticket.createdBy);
    if (ticket.assignedAgentId) ids.add(ticket.assignedAgentId);
    if (ticket.verifiedById) ids.add(ticket.verifiedById);
    for (const assignment of ticket.assignments) {
      if (assignment.employee?.userId) ids.add(assignment.employee.userId);
    }
    return [...ids];
  }
}
