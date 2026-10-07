import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentType,
  Prisma,
  TicketAssignment,
  TicketAttachment,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import {
  UnitOfWorkService,
  Tx,
} from '../../../common/prisma/unit-of-work.service';
import { ActorContext } from '../../../common/auth/actor.decorator';
import {
  AuditService,
  AUDIT_ACTIONS,
  ticketSnapshot,
} from '../../../common/audit/audit.service';
import { OutboxPublisher } from '../../../common/events/outbox.publisher';
import { DOMAIN_EVENTS } from '../../../common/events/domain-event.interface';
import {
  PaginatedResult,
  paginatedResult,
  parsePagination,
} from '../../../common/utils/pagination';
import { SlaEngineService } from '../sla/sla-engine.service';
import { SlaPoliciesService } from '../sla/sla-policies.service';
import { RoutingRulesService } from '../routing/routing-rules.service';
import { DepartmentsService } from '../departments/departments.service';
import {
  InvalidTransitionError,
  TicketCapability,
  assertTransition,
} from './ticket-state-machine';
import {
  TicketAccessContext,
  TicketAuthorizationService,
  TicketWithAccess,
} from './ticket-authorization.service';
import { TicketNotificationsService } from './ticket-notifications.service';
import {
  AddAttachmentDto,
  AddCommentDto,
  AssignTicketDto,
  CancelTicketDto,
  ClearEscalationDto,
  CloseOverrideDto,
  CloseTicketDto,
  CreateTicketDto,
  EscalateTicketDto,
  ReopenTicketDto,
  SubmitResolutionDto,
  TicketQueryDto,
  UnassignTicketDto,
  UpdateTicketDto,
  VerifyResolutionDto,
} from './dto/ticket.dto';

/** Ticket prefix used when generating human-facing reference numbers. */
const TICKET_PREFIX = 'TFX';
/** Human-facing short reference, e.g. "TFX-7G4K2M". Not a sequential counter. */
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Largest registerable attachment. Bytes are uploaded directly to
 *  storage; this only bounds the metadata row. */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
/** MIME types that may be attached to a ticket. */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]);

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWorkService,
    private readonly authz: TicketAuthorizationService,
    private readonly slaEngine: SlaEngineService,
    private readonly slaPolicies: SlaPoliciesService,
    private readonly routing: RoutingRulesService,
    private readonly departments: DepartmentsService,
    private readonly outbox: OutboxPublisher,
    private readonly audit: AuditService,
    private readonly ticketNotifications: TicketNotificationsService,
  ) {}

  // ==========================================================================
  // Creation
  // ==========================================================================

  /**
   * Creates a ticket.
   *
   * Runs as ONE transaction covering: ticket row + SLA deadlines + initial
   * activity + audit record + outbox events. Routing decides department, agent
   * and SLA policy from database configuration; nothing is hardcoded.
   *
   * The tenant is derived from the actor, never from the payload, so a caller
   * cannot create a ticket inside another organization.
   */
  async create(
    dto: CreateTicketDto,
    actor: ActorContext,
  ): Promise<TicketWithAccess> {
    const now = new Date();
    const correlationId = randomUUID();

    // A client may only file tickets for their own account.
    if (actor.isClient) {
      if (!actor.linkedClientId) {
        throw new ForbiddenException(
          'Your user account is not linked to a client record',
        );
      }
    }

    const type =
      dto.type ??
      (actor.isClient ? TicketType.CLIENT_SUPPORT : TicketType.INTERNAL);
    const category = dto.category ?? TicketCategory.GENERAL;
    const priority = dto.priority ?? TicketPriority.MEDIUM;

    const requesterEmployee = await this.prisma.employee.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });

    // ---- resolve client / project with tenant + ownership checks ----
    let clientId: string | null = null;
    if (actor.isClient) {
      clientId = actor.linkedClientId ?? null;
    }

    const projectId: string | null = dto.projectId ?? null;
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          organizationId: actor.organizationId,
          ...(clientId ? { clientId } : {}),
        },
        select: { id: true, clientId: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      // A client filing a ticket automatically scopes it to their own client.
      clientId = clientId ?? project.clientId;
    }

    // ---- routing (database-configured) ----
    const route = await this.routing.resolve(actor.organizationId, {
      ticketType: type,
      category,
      priority,
      departmentId: dto.departmentId ?? null,
    });

    const departmentId = dto.departmentId
      ? await this.departments.assertInOrg(
          this.prisma,
          dto.departmentId,
          actor.organizationId,
        )
      : route.departmentId;

    // ---- SLA policy (database-configured, deterministic) ----
    const policy = await this.slaPolicies.resolvePolicy(actor.organizationId, {
      ticketType: type,
      category,
      priority,
      departmentId,
    });
    const deadlines = this.slaEngine.computeDeadlines(policy, now);

    const ticketNumber = `${TICKET_PREFIX}-${this.generateReference()}`;

    return this.uow.run(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          type,
          title: dto.title.trim(),
          description: dto.description.trim(),
          status: TicketStatus.OPEN,
          priority,
          category,
          source: dto.source ?? (actor.isClient ? 'CLIENT_PORTAL' : 'INTERNAL'),
          organizationId: actor.organizationId,
          requesterId: actor.userId,
          requesterEmployeeId: requesterEmployee?.id ?? null,
          // Display/history only. Authorization never reads this column.
          requesterRoleSnapshot: actor.roles.join(','),
          clientId,
          projectId,
          departmentId,
          assignedAgentId: route.defaultAgentId,
          slaPolicyId: policy?.id ?? null,
          firstResponseDeadline: deadlines.firstResponseDeadline,
          resolutionDeadline: deadlines.resolutionDeadline,
          createdBy: actor.userId,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: now,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          userId: actor.userId,
          action: 'ticket.created',
          description: `Ticket ${ticket.ticketNumber} created`,
          metadata: { type, category, priority },
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: actor.organizationId,
        action: AUDIT_ACTIONS.TICKET_CREATED,
        entityType: 'Ticket',
        entityId: ticket.id,
        actor,
        after: ticketSnapshot(ticket),
        metadata: {
          ticketNumber: ticket.ticketNumber,
          type,
          category,
          priority,
        },
      });

      const createdEventData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        type,
        status: ticket.status,
        priority,
        departmentId,
        assignedAgentId: route.defaultAgentId,
        requesterId: actor.userId,
        clientId,
      };

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_CREATED,
        organizationId: actor.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.created:${ticket.id}`,
        data: createdEventData,
      });

      // Durable notifications for the participants, committed
      // in the same transaction as the ticket itself.
      await this.ticketNotifications.dispatch(tx, {
        eventType: DOMAIN_EVENTS.TICKET_CREATED,
        organizationId: actor.organizationId,
        actorId: actor.userId,
        data: createdEventData,
      });

      if (route.autoAssignEmployeeId) {
        await this.assignEmployeesInternal(
          tx,
          {
            id: ticket.id,
            organizationId: ticket.organizationId,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            type,
          },
          { primary: [{ employeeId: route.autoAssignEmployeeId }] },
          actor,
          correlationId,
          'routing-rule:auto-assign',
        );
      }

      return this.reload(tx, ticket.id);
    });
  }

  // ==========================================================================
  // Reads
  // ==========================================================================

  /**
   * Lists tickets visible to the actor.
   *
   * Every query is constrained by `organizationId` from the JWT. On top of that
   * the actor's role narrows the row set further (client -> own client only,
   * employee -> own requests + active assignments, staff -> everything in the
   * org). Pagination is always bounded.
   */
  async list(
    query: TicketQueryDto,
    actor: ActorContext,
  ): Promise<PaginatedResult<unknown>> {
    const { skip, take, page, limit } = parsePagination(
      query.page,
      query.limit,
    );
    const where = await this.buildListWhere(query, actor);

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: this.buildOrderBy(query),
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          type: true,
          category: true,
          clientId: true,
          projectId: true,
          departmentId: true,
          assignedAgentId: true,
          createdAt: true,
          updatedAt: true,
          lastActivityAt: true,
          firstResponseDeadline: true,
          firstRespondedAt: true,
          resolutionDeadline: true,
          resolvedAt: true,
          slaPausedAt: true,
          totalPausedDurationMs: true,
          slaResponseBreachedAt: true,
          slaResolutionBreachedAt: true,
          escalationLevel: true,
          clientConfirmed: true,
          reopenCount: true,
          client: { select: { id: true, name: true, companyName: true } },
          project: { select: { id: true, name: true } },
          department: { select: { id: true, code: true, name: true } },
          assignedAgent: { select: { id: true, name: true, email: true } },
          assignments: {
            where: { isActive: true },
            select: {
              id: true,
              type: true,
              employeeId: true,
              employee: {
                select: {
                  id: true,
                  designation: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return paginatedResult(
      tickets.map((ticket) => ({
        ...ticket,
        sla: this.slaEngine.describe(ticket),
      })),
      total,
      page,
      limit,
    );
  }

  /** Full ticket detail, including comments, assignment history and timeline. */
  async findOne(actor: ActorContext, ticketId: string) {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanRead(actor, access);

    const isStaff = !actor.isClient;
    const ticket = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        client: {
          select: { id: true, name: true, companyName: true, email: true },
        },
        project: { select: { id: true, name: true, status: true } },
        department: { select: { id: true, code: true, name: true } },
        assignedAgent: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true } },
        slaPolicy: { select: { id: true, name: true } },
        comments: {
          where: isStaff ? {} : { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
          include: { uploader: { select: { id: true, name: true } } },
        },
        // Full history, including inactive rows, so reassignment is auditable.
        assignments: {
          orderBy: { assignedAt: 'asc' },
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                designation: true,
                departmentId: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
            assigner: { select: { id: true, name: true } },
            unassignedBy: { select: { id: true, name: true } },
          },
        },
        escalations: { orderBy: { escalatedAt: 'desc' } },
      },
    });

    return {
      ...ticket,
      sla: this.slaEngine.describe(ticket),
      access: {
        capabilities: access.capabilities,
        isRequester: access.isRequester,
        isAssignee: access.isAssignee,
        isPrimaryAssignee: access.isPrimaryAssignee,
        isOwnClient: access.isOwnClient,
      },
    };
  }

  /** Paginated activity timeline. */
  async listActivities(
    actor: ActorContext,
    ticketId: string,
    page?: number,
    limit?: number,
  ) {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanRead(actor, access);

    const { skip, take, page: p, limit: l } = parsePagination(page, limit);
    const [total, activities] = await Promise.all([
      this.prisma.ticketActivity.count({ where: { ticketId } }),
      this.prisma.ticketActivity.findMany({
        where: { ticketId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);
    return paginatedResult(activities, total, p, l);
  }

  /** Paginated comment thread. Internal notes are hidden from non-staff. */
  async listComments(
    actor: ActorContext,
    ticketId: string,
    page?: number,
    limit?: number,
  ) {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanRead(actor, access);

    // Internal notes are visible only to staff (non-client users with read access).
    const isStaff = !actor.isClient;
    const { skip, take, page: p, limit: l } = parsePagination(page, limit);

    const [total, comments] = await Promise.all([
      this.prisma.ticketComment.count({
        where: { ticketId, ...(isStaff ? {} : { isInternal: false }) },
      }),
      this.prisma.ticketComment.findMany({
        where: { ticketId, ...(isStaff ? {} : { isInternal: false }) },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);
    return paginatedResult(comments, total, p, l);
  }

  // ==========================================================================
  // Assignment
  // ==========================================================================

  /**
   * Assigns employees, preserving full history.
   *
   * Ordering inside one transaction:
   *   1. optionally close out all active assignments (replaceAll)
   *   2. close out the current active PRIMARY before inserting the new one,
   *      so the partial unique index never sees two active primaries
   *   3. deactivate any employee already active on this ticket
   *   4. insert new assignment rows with the next sequence number
   *   5. move the ticket to ASSIGNED when a primary now exists
   *   6. write activity + audit
   *   7. publish outbox events
   */
  async assign(
    actor: ActorContext,
    ticketId: string,
    dto: AssignTicketDto,
  ): Promise<TicketWithAccess> {
    await this.authz.assertCanAssign(actor);
    const access = await this.loadWithAccess(actor, ticketId);

    if (
      (
        [TicketStatus.CLOSED, TicketStatus.CANCELLED] as TicketStatus[]
      ).includes(access.ticket.status)
    ) {
      throw new ConflictException(
        `A ${access.ticket.status} ticket cannot be assigned`,
      );
    }

    const incoming = [
      ...(dto.primary ?? []).map((item) => ({
        employeeId: item.employeeId,
        type: AssignmentType.PRIMARY,
      })),
      ...(dto.supporting ?? []).map((item) => ({
        employeeId: item.employeeId,
        type: item.type ?? AssignmentType.SUPPORTING,
      })),
    ];

    if (incoming.length === 0 && !dto.replaceAll) {
      throw new BadRequestException('No employees supplied for assignment');
    }

    // At most one primary per request; extra ones are a client error rather
    // than a silently truncated assignment.
    if ((dto.primary?.length ?? 0) > 1) {
      throw new BadRequestException(
        'Only one PRIMARY assignee can be active at a time',
      );
    }

    const primaryEmployees = new Set(
      (dto.primary ?? []).map((item) => item.employeeId),
    );
    const supportingEmployees = new Set(
      (dto.supporting ?? []).map((item) => item.employeeId),
    );
    const overlap = [...primaryEmployees].filter((id) =>
      supportingEmployees.has(id),
    );
    if (overlap.length > 0) {
      throw new BadRequestException(
        'An employee cannot be both PRIMARY and SUPPORTING on the same ticket',
      );
    }

    return this.uow.run(async (tx) =>
      this.assignEmployeesInternal(tx, access.ticket, dto, actor, randomUUID()),
    );
  }

  /**
   * Shared by the assign endpoint and routing-rule auto-assignment.
   * Requires a caller-supplied transaction client so auto-assignment happens in
   * the same transaction as ticket creation.
   */
  private async assignEmployeesInternal(
    tx: Tx,
    ticket: {
      id: string;
      organizationId: string;
      ticketNumber: string;
      status: TicketStatus;
      type: TicketType;
    },
    dto: AssignTicketDto,
    actor: ActorContext,
    correlationId: string,
    activityDescription?: string,
  ): Promise<TicketWithAccess> {
    const now = new Date();

    const incoming = [
      ...(dto.primary ?? []).map((item) => ({
        employeeId: item.employeeId,
        type: AssignmentType.PRIMARY,
      })),
      ...(dto.supporting ?? []).map((item) => ({
        employeeId: item.employeeId,
        type: item.type ?? AssignmentType.SUPPORTING,
      })),
    ];

    // Validate every employee exists, is active and belongs to the tenant —
    // this is what prevents cross-tenant / cross-department assignment.
    const employeeIds = incoming.map((item) => item.employeeId);
    if (employeeIds.length > 0) {
      const employees = await tx.employee.findMany({
        where: {
          id: { in: employeeIds },
          organizationId: ticket.organizationId,
          status: 'ACTIVE',
        },
        select: { id: true, userId: true, employeeCode: true },
      });
      const found = new Set(employees.map((e) => e.id));
      const missing = employeeIds.filter((id) => !found.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Active employee(s) not found in this organization: ${missing.join(', ')}`,
        );
      }
    }

    const existingActive = await tx.ticketAssignment.findMany({
      where: { ticketId: ticket.id, isActive: true },
      orderBy: { assignedAt: 'desc' },
      select: { id: true, employeeId: true, type: true, sequence: true },
    });
    const nextSequence =
      (existingActive[0]?.sequence ?? 0) + incoming.length + 1;

    // 1. Optionally close out everything currently active.
    if (dto.replaceAll && existingActive.length > 0) {
      await this.closeAssignments(
        tx,
        ticket.id,
        existingActive.map((a) => a.id),
        actor,
        now,
      );
    }

    // 2. Close out the incumbent primary / any employee being re-assigned.
    const incomingIds = new Set(employeeIds);
    const toDeactivate = existingActive.filter(
      (assignment) =>
        assignment.type === AssignmentType.PRIMARY ||
        incomingIds.has(assignment.employeeId),
    );
    if (toDeactivate.length > 0) {
      await this.closeAssignments(
        tx,
        ticket.id,
        toDeactivate.map((a) => a.id),
        actor,
        now,
      );
    }

    // 3. Insert the new active rows.
    let sequence = nextSequence - incoming.length;
    const created: TicketAssignment[] = [];
    for (const item of incoming) {
      sequence += 1;
      const row = await tx.ticketAssignment.create({
        data: {
          ticketId: ticket.id,
          employeeId: item.employeeId,
          type: item.type,
          assignedBy: actor.userId,
          assignedAt: now,
          isActive: true,
          sequence,
        },
      });
      created.push(row);
    }

    // 4. Advance the lifecycle when a primary now exists.
    const hasPrimary = created.some(
      (row) => row.type === AssignmentType.PRIMARY,
    );
    const nextStatus =
      ticket.status === TicketStatus.OPEN && created.length > 0
        ? TicketStatus.ASSIGNED
        : ticket.status;

    if (nextStatus !== ticket.status) {
      await this.applyStatusChange(
        tx,
        ticket,
        nextStatus,
        actor,
        this.staffCapabilities(actor),
        correlationId,
        { reason: 'assignment' },
      );
    } else {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: now, lastActivityAt: now },
      });
    }

    // 5. Timeline + audit.
    await tx.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        userId: actor.userId,
        action: 'ticket.assigned',
        description:
          activityDescription ?? `Assigned ${created.length} employee(s)`,
        metadata: {
          assignments: created.map((row) => ({
            assignmentId: row.id,
            employeeId: row.employeeId,
            type: row.type,
          })),
        },
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      },
    });

    await this.audit.record(tx, {
      organizationId: ticket.organizationId,
      action: AUDIT_ACTIONS.TICKET_ASSIGNED,
      entityType: 'Ticket',
      entityId: ticket.id,
      actor,
      after: {
        assignments: created.map((row) => ({
          employeeId: row.employeeId,
          type: row.type,
        })),
      },
    });

    // 6. Events.
    const assignedEventData = {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      assignments: created.map((row) => ({
        assignmentId: row.id,
        employeeId: row.employeeId,
        type: row.type,
      })),
      status: nextStatus,
    };

    await this.outbox.publish(tx, {
      eventType: DOMAIN_EVENTS.TICKET_ASSIGNED,
      organizationId: ticket.organizationId,
      actorId: actor.userId,
      correlationId,
      idempotencyKey: `ticket.assigned:${ticket.id}:${created
        .map((r) => r.id)
        .sort()
        .join(',')}`,
      data: assignedEventData,
    });

    await this.ticketNotifications.dispatch(tx, {
      eventType: DOMAIN_EVENTS.TICKET_ASSIGNED,
      organizationId: ticket.organizationId,
      actorId: actor.userId,
      data: assignedEventData,
    });

    return this.reload(tx, ticket.id);
  }

  /** Deactivates assignments without deleting rows. */
  async unassign(
    actor: ActorContext,
    ticketId: string,
    dto: UnassignTicketDto,
  ): Promise<TicketWithAccess> {
    await this.authz.assertCanAssign(actor);
    const access = await this.loadWithAccess(actor, ticketId);
    const now = new Date();
    const correlationId = randomUUID();

    return this.uow.run(async (tx) => {
      const active = await tx.ticketAssignment.findMany({
        where: { ticketId, isActive: true },
        select: { id: true, employeeId: true, type: true },
      });

      const targets = active.filter((assignment) => {
        if (dto.assignmentId) return assignment.id === dto.assignmentId;
        if (dto.employeeId) return assignment.employeeId === dto.employeeId;
        return false;
      });

      if (targets.length === 0) {
        throw new NotFoundException('No matching active assignment found');
      }

      await this.closeAssignments(
        tx,
        ticketId,
        targets.map((t) => t.id),
        actor,
        now,
        dto.reason,
      );

      // Losing the primary assignee sends the ticket back to the queue.
      const stillHasPrimary = active.some(
        (assignment) =>
          assignment.type === AssignmentType.PRIMARY &&
          !targets.some((t) => t.id === assignment.id),
      );

      const nextStatus =
        !stillHasPrimary && access.ticket.status === TicketStatus.ASSIGNED
          ? TicketStatus.OPEN
          : access.ticket.status;

      if (nextStatus !== access.ticket.status) {
        await this.applyStatusChange(
          tx,
          access.ticket,
          nextStatus,
          actor,
          access.capabilities,
          correlationId,
          { reason: 'unassignment' },
        );
      } else {
        await tx.ticket.update({
          where: { id: ticketId },
          data: { updatedAt: now, lastActivityAt: now },
        });
      }

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.unassigned',
          description: `Removed ${targets.length} assignment(s)`,
          metadata: {
            assignments: targets.map((t) => ({
              assignmentId: t.id,
              employeeId: t.employeeId,
              type: t.type,
            })),
            reason: dto.reason ?? null,
          },
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_UNASSIGNED,
        entityType: 'Ticket',
        entityId: ticketId,
        actor,
        before: {
          assignments: targets.map((t) => ({
            employeeId: t.employeeId,
            type: t.type,
          })),
        },
        metadata: { reason: dto.reason ?? null },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_UNASSIGNED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.unassigned:${ticketId}:${now.getTime()}`,
        data: {
          ticketId,
          ticketNumber: access.ticket.ticketNumber,
          assignments: targets.map((t) => ({
            assignmentId: t.id,
            employeeId: t.employeeId,
            type: t.type,
          })),
          status: nextStatus,
        },
      });

      return this.reload(tx, ticketId);
    });
  }

  /** Shared helper: soft-close assignment rows, keeping them for history. */
  private async closeAssignments(
    tx: Tx,
    ticketId: string,
    assignmentIds: string[],
    actor: ActorContext,
    now: Date,
    reason?: string,
  ): Promise<void> {
    if (assignmentIds.length === 0) return;
    await tx.ticketAssignment.updateMany({
      where: { id: { in: assignmentIds }, isActive: true },
      data: {
        isActive: false,
        unassignedAt: now,
        unassignedById: actor.userId,
        unassignReason: reason ?? null,
      },
    });
  }

  // ==========================================================================
  // Lifecycle actions
  // ==========================================================================

  /** Marks work as started. */
  async startWork(
    actor: ActorContext,
    ticketId: string,
  ): Promise<TicketWithAccess> {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanRead(actor, access);
    return this.transition(
      actor,
      access,
      TicketStatus.IN_PROGRESS,
      'Employee started work',
    );
  }

  /**
   * Employee submits a proposed resolution. This does NOT resolve the ticket —
   * an agent must verify it — which is what prevents an employee from bypassing
   * verification.
   */
  async submitResolution(
    actor: ActorContext,
    ticketId: string,
    dto: SubmitResolutionDto,
  ): Promise<TicketWithAccess> {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanSubmitResolution(actor, access);

    const now = new Date();
    const correlationId = randomUUID();

    return this.uow.run(async (tx) => {
      // Resolution is the transition into RESOLUTION_SUBMITTED.
      const updated = await this.applyStatusChange(
        tx,
        access.ticket,
        TicketStatus.RESOLUTION_SUBMITTED,
        actor,
        access.capabilities,
        correlationId,
        { reason: 'resolution submitted' },
        {
          resolution: dto.resolution.trim(),
          resolutionSubmittedAt: now,
          resolutionSubmittedById: actor.userId,
        },
      );

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.resolution_submitted',
          description: 'Resolution submitted for verification',
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_RESOLUTION_SUBMITTED,
        entityType: 'Ticket',
        entityId: ticketId,
        actor,
        before: ticketSnapshot(access.ticket),
        after: ticketSnapshot(updated),
      });

      const submittedEventData = {
        ticketId,
        ticketNumber: access.ticket.ticketNumber,
        submittedById: actor.userId,
        assignedAgentId: access.ticket.assignedAgentId,
      };

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_RESOLUTION_SUBMITTED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.resolution_submitted:${ticketId}:${now.getTime()}`,
        data: submittedEventData,
      });

      await this.ticketNotifications.dispatch(tx, {
        eventType: DOMAIN_EVENTS.TICKET_RESOLUTION_SUBMITTED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        data: submittedEventData,
      });

      return this.reload(tx, ticketId);
    });
  }

  /**
   * Agent verifies (or rejects) a submitted resolution.
   * Rejection returns the ticket to IN_PROGRESS so it can be worked on again.
   */
  async verifyResolution(
    actor: ActorContext,
    ticketId: string,
    dto: VerifyResolutionDto,
  ): Promise<TicketWithAccess> {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanVerifyResolution(actor, access);

    if (access.ticket.status !== TicketStatus.RESOLUTION_SUBMITTED) {
      throw new ConflictException(
        'A resolution can only be verified while the ticket is RESOLUTION_SUBMITTED',
      );
    }

    const now = new Date();
    const correlationId = randomUUID();

    return this.uow.run(async (tx) => {
      if (dto.approved) {
        // RESOLUTION_SUBMITTED -> UNDER_VERIFICATION -> RESOLVED.
        // The second hop must re-read the row, otherwise the state machine would
        // be asked to validate RESOLUTION_SUBMITTED -> RESOLVED, which is not a
        // legal transition (resolution is never self-verifying).
        await this.applyStatusChange(
          tx,
          access.ticket,
          TicketStatus.UNDER_VERIFICATION,
          actor,
          access.capabilities,
          correlationId,
          { reason: 'verification started', silent: true },
        );

        const underVerification = await tx.ticket.findUniqueOrThrow({
          where: { id: ticketId },
        });

        const updated = await this.applyStatusChange(
          tx,
          underVerification,
          TicketStatus.RESOLVED,
          actor,
          access.capabilities,
          correlationId,
          { reason: 'resolution verified' },
          {
            verifiedBy: { connect: { id: actor.userId } },
            verifiedAt: now,
            resolvedAt: now,
          },
        );

        await tx.ticketActivity.create({
          data: {
            ticketId,
            userId: actor.userId,
            action: 'ticket.resolution_verified',
            description: 'Resolution verified as correct',
            ipAddress: actor.ipAddress ?? null,
            userAgent: actor.userAgent ?? null,
          },
        });

        await this.audit.record(tx, {
          organizationId: access.ticket.organizationId,
          action: AUDIT_ACTIONS.TICKET_RESOLUTION_VERIFIED,
          entityType: 'Ticket',
          entityId: ticketId,
          actor,
          before: ticketSnapshot(access.ticket),
          after: ticketSnapshot(updated),
        });

        await this.outbox.publish(tx, {
          eventType: DOMAIN_EVENTS.TICKET_RESOLUTION_VERIFIED,
          organizationId: access.ticket.organizationId,
          actorId: actor.userId,
          correlationId,
          idempotencyKey: `ticket.resolution_verified:${ticketId}:${now.getTime()}`,
          data: {
            ticketId,
            ticketNumber: access.ticket.ticketNumber,
            verifiedById: actor.userId,
            requesterId: access.ticket.requesterId,
          },
        });

        // The user-facing outcome is "resolved": notifying on the
        // intermediate verification event as well would send every
        // participant two notifications for one business outcome.
        const resolvedEventData = {
          ticketId,
          ticketNumber: access.ticket.ticketNumber,
          requesterId: access.ticket.requesterId,
          type: access.ticket.type,
        };

        await this.outbox.publish(tx, {
          eventType: DOMAIN_EVENTS.TICKET_RESOLVED,
          organizationId: access.ticket.organizationId,
          actorId: actor.userId,
          correlationId,
          idempotencyKey: `ticket.resolved:${ticketId}:${now.getTime()}`,
          data: resolvedEventData,
        });

        await this.ticketNotifications.dispatch(tx, {
          eventType: DOMAIN_EVENTS.TICKET_RESOLVED,
          organizationId: access.ticket.organizationId,
          actorId: actor.userId,
          data: resolvedEventData,
        });

        return this.reload(tx, ticketId);
      }

      // ---- rejection ----
      if (!dto.rejectionReason || dto.rejectionReason.trim().length < 5) {
        throw new BadRequestException(
          'A rejection must include a reason of at least 5 characters',
        );
      }

      const updated = await this.applyStatusChange(
        tx,
        access.ticket,
        TicketStatus.IN_PROGRESS,
        actor,
        access.capabilities,
        correlationId,
        { reason: 'resolution rejected' },
      );

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.resolution_rejected',
          description: dto.rejectionReason.trim(),
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_RESOLUTION_REJECTED,
        entityType: 'Ticket',
        entityId: ticketId,
        actor,
        before: ticketSnapshot(access.ticket),
        after: ticketSnapshot(updated),
        metadata: { rejectionReason: dto.rejectionReason.trim() },
      });

      const rejectedEventData = {
        ticketId,
        ticketNumber: access.ticket.ticketNumber,
        rejectionReason: dto.rejectionReason.trim(),
        requesterId: access.ticket.requesterId,
      };

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_RESOLUTION_REJECTED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.resolution_rejected:${ticketId}:${now.getTime()}`,
        data: rejectedEventData,
      });

      await this.ticketNotifications.dispatch(tx, {
        eventType: DOMAIN_EVENTS.TICKET_RESOLUTION_REJECTED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        data: rejectedEventData,
      });

      return this.reload(tx, ticketId);
    });
  }

  /** Client confirms the resolution, which permits closure. */
  async clientConfirm(
    actor: ActorContext,
    ticketId: string,
  ): Promise<TicketWithAccess> {
    const access = await this.loadWithAccess(actor, ticketId);

    if (access.ticket.status !== TicketStatus.RESOLVED) {
      throw new ConflictException(
        'Only a RESOLVED ticket can be confirmed by the client',
      );
    }
    if (!access.isRequester && !actor.isSuperAdmin && !actor.isAdmin) {
      throw new ForbiddenException(
        'Only the requester can confirm the resolution',
      );
    }

    const now = new Date();
    return this.uow.run(async (tx) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          clientConfirmed: true,
          clientConfirmedAt: now,
          updatedAt: now,
          lastActivityAt: now,
        },
      });
      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.client_confirmed',
          description: 'Requester confirmed the resolution',
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });
      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_CLIENT_CONFIRMED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        idempotencyKey: `ticket.client_confirmed:${ticketId}`,
        data: { ticketId, ticketNumber: access.ticket.ticketNumber },
      });
      return this.reload(tx, ticketId);
    });
  }

  /** Client reports the problem persists, reopening the ticket. */
  async reopen(
    actor: ActorContext,
    ticketId: string,
    dto: ReopenTicketDto,
  ): Promise<TicketWithAccess> {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanReopen(actor, access);

    const now = new Date();
    const correlationId = randomUUID();

    return this.uow.run(async (tx) => {
      // Reopening resets the resolution outcome but keeps prior timestamps as
      // history. The resolution SLA restarts from now with a fresh window,
      // while the already-recorded breaches stay on the record.
      const policy = access.ticket.slaPolicyId
        ? await tx.sLAPolicy.findUnique({
            where: { id: access.ticket.slaPolicyId },
          })
        : null;
      const freshDeadlines = this.slaEngine.computeDeadlines(policy, now);

      const updated = await this.applyStatusChange(
        tx,
        access.ticket,
        TicketStatus.REOPENED,
        actor,
        access.capabilities,
        correlationId,
        { reason: dto.reason },
        {
          reopenCount: { increment: 1 },
          resolvedAt: null,
          verifiedAt: null,
          verifiedBy: { disconnect: true },
          clientConfirmed: false,
          clientConfirmedAt: null,
          resolutionDeadline: freshDeadlines.resolutionDeadline,
          slaResolutionWarnedAt: null,
          slaResolutionBreachedAt: null,
          totalPausedDurationMs: 0n,
        },
      );

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.reopened',
          description: dto.reason,
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_REOPENED,
        entityType: 'Ticket',
        entityId: ticketId,
        actor,
        before: ticketSnapshot(access.ticket),
        after: ticketSnapshot(updated),
        metadata: { reason: dto.reason, reopenCount: updated.reopenCount },
      });

      const reopenedEventData = {
        ticketId,
        ticketNumber: access.ticket.ticketNumber,
        reason: dto.reason,
        reopenCount: updated.reopenCount,
        assignedAgentId: access.ticket.assignedAgentId,
        // Repeated reopens escalate on the third occurrence.
        isCritical: updated.reopenCount >= 3,
      };

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_REOPENED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.reopened:${ticketId}:${updated.reopenCount}`,
        data: reopenedEventData,
      });

      await this.ticketNotifications.dispatch(tx, {
        eventType: DOMAIN_EVENTS.TICKET_REOPENED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        data: reopenedEventData,
      });

      return this.reload(tx, ticketId);
    });
  }

  /** Normal closure. Client tickets require prior client confirmation. */
  async close(
    actor: ActorContext,
    ticketId: string,
    dto: CloseTicketDto,
  ): Promise<TicketWithAccess> {
    const access = await this.loadWithAccess(actor, ticketId);
    const { requiresOverride } = await this.authz.assertCanClose(actor, access);

    if (requiresOverride) {
      throw new ForbiddenException(
        'This client ticket must be confirmed by the client. Use the override endpoint with a justification if this is genuinely required.',
      );
    }

    return this.closeInternal(actor, access, dto.note, false, null);
  }

  /**
   * Staff override for closing a client ticket that the client has not
   * confirmed. Requires the explicit permission, a mandatory reason, an audit
   * record, and notifies the client.
   */
  async closeWithOverride(
    actor: ActorContext,
    ticketId: string,
    dto: CloseOverrideDto,
  ): Promise<TicketWithAccess> {
    this.authz.assertCanOverrideClose(actor);
    const access = await this.loadWithAccess(actor, ticketId);
    return this.closeInternal(actor, access, dto.reason, true, dto.reason);
  }

  private async closeInternal(
    actor: ActorContext,
    access: TicketAccessContext,
    note: string | undefined,
    isOverride: boolean,
    overrideReason: string | null,
  ): Promise<TicketWithAccess> {
    const ticketId = access.ticket.id;
    const now = new Date();
    const correlationId = randomUUID();

    if (access.ticket.status !== TicketStatus.RESOLVED) {
      throw new ConflictException('Only a RESOLVED ticket can be closed');
    }

    return this.uow.run(async (tx) => {
      const updated = await this.applyStatusChange(
        tx,
        access.ticket,
        TicketStatus.CLOSED,
        actor,
        access.capabilities,
        correlationId,
        { reason: isOverride ? 'closure override' : 'closed' },
        {
          closedAt: now,
          closedBy: { connect: { id: actor.userId } },
          closeOverride: isOverride,
          closeOverrideReason: overrideReason,
          clientConfirmed: isOverride ? access.ticket.clientConfirmed : true,
        },
      );

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: isOverride ? 'ticket.close_override' : 'ticket.closed',
          description: note ?? overrideReason ?? 'Ticket closed',
          metadata: isOverride ? { overrideReason } : undefined,
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: isOverride
          ? AUDIT_ACTIONS.TICKET_CLOSE_OVERRIDE
          : AUDIT_ACTIONS.TICKET_CLOSED,
        entityType: 'Ticket',
        entityId: ticketId,
        actor,
        before: ticketSnapshot(access.ticket),
        after: ticketSnapshot(updated),
        metadata: isOverride
          ? { overrideReason, note: note ?? null }
          : undefined,
      });

      const closedEventData = {
        ticketId,
        ticketNumber: access.ticket.ticketNumber,
        closeOverride: isOverride,
        overrideReason: overrideReason ?? null,
        // The client is always told, including on an override.
        requesterId: access.ticket.requesterId,
      };

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_CLOSED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.closed:${ticketId}`,
        data: closedEventData,
      });

      await this.ticketNotifications.dispatch(tx, {
        eventType: DOMAIN_EVENTS.TICKET_CLOSED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        data: closedEventData,
      });

      return this.reload(tx, ticketId);
    });
  }

  /**
   * Cancels a ticket. The state machine decides who may cancel from
   * which status: the requester may withdraw before work begins or
   * while waiting on them; staff (agent/admin/super-admin) may cancel
   * from any non-terminal state. Terminal tickets are rejected with 409.
   */
  async cancel(
    actor: ActorContext,
    ticketId: string,
    dto: CancelTicketDto,
  ): Promise<TicketWithAccess> {
    const access = await this.loadWithAccess(actor, ticketId);

    if (
      (
        [TicketStatus.CLOSED, TicketStatus.CANCELLED] as TicketStatus[]
      ).includes(access.ticket.status)
    ) {
      throw new ConflictException(
        `A ${access.ticket.status} ticket cannot be cancelled`,
      );
    }

    const now = new Date();
    const correlationId = randomUUID();
    const reason = dto.reason?.trim() || 'Ticket cancelled';

    return this.uow.run(async (tx) => {
      const updated = await this.applyStatusChange(
        tx,
        access.ticket,
        TicketStatus.CANCELLED,
        actor,
        access.capabilities,
        correlationId,
        { reason },
        { cancelledAt: now },
      );

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.cancelled',
          description: reason,
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_CANCELLED,
        entityType: 'Ticket',
        entityId: ticketId,
        actor,
        before: ticketSnapshot(access.ticket),
        after: ticketSnapshot(updated),
        metadata: { reason },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_CANCELLED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.cancelled:${ticketId}`,
        data: {
          ticketId,
          ticketNumber: access.ticket.ticketNumber,
          reason,
          requesterId: access.ticket.requesterId,
          type: access.ticket.type,
        },
      });

      return this.reload(tx, ticketId);
    });
  }

  /** Staff-initiated escalation. Never overwrites the lifecycle status. */
  async escalate(
    actor: ActorContext,
    ticketId: string,
    dto: EscalateTicketDto,
  ): Promise<TicketWithAccess> {
    this.authz.assertCanEscalate(actor);
    const access = await this.loadWithAccess(actor, ticketId);
    const now = new Date();

    return this.uow.run(async (tx) => {
      const escalation = await tx.ticketEscalation.create({
        data: {
          ticketId,
          level: dto.level,
          trigger: 'MANUAL',
          reason: dto.reason,
          escalatedById: actor.userId,
          escalatedAt: now,
        },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          escalationLevel: dto.level,
          escalatedAt: now,
          escalatedById: actor.userId,
          escalationReason: dto.reason,
          escalationClearedAt: null,
          updatedAt: now,
          lastActivityAt: now,
          // The lifecycle status is intentionally left untouched.
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.escalated',
          description: `Escalated to ${dto.level}: ${dto.reason}`,
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_ESCALATED,
        entityType: 'Ticket',
        entityId: ticketId,
        actor,
        before: { escalationLevel: access.ticket.escalationLevel },
        after: { escalationLevel: dto.level },
        metadata: { reason: dto.reason, escalationId: escalation.id },
      });

      const escalatedEventData = {
        ticketId,
        ticketNumber: access.ticket.ticketNumber,
        level: dto.level,
        reason: dto.reason,
        status: access.ticket.status,
      };

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_ESCALATED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        idempotencyKey: `ticket.escalated:${escalation.id}`,
        data: escalatedEventData,
      });

      // Escalations also reach the organization's admins.
      await this.ticketNotifications.dispatch(tx, {
        eventType: DOMAIN_EVENTS.TICKET_ESCALATED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        data: escalatedEventData,
      });

      return this.reload(tx, ticketId);
    });
  }

  async clearEscalation(
    actor: ActorContext,
    ticketId: string,
    dto: ClearEscalationDto,
  ): Promise<TicketWithAccess> {
    this.authz.assertCanEscalate(actor);
    const access = await this.loadWithAccess(actor, ticketId);
    const now = new Date();

    return this.uow.run(async (tx) => {
      await tx.ticketEscalation.updateMany({
        where: { ticketId, clearedAt: null },
        data: { clearedAt: now, clearedById: actor.userId },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          escalationLevel: 'NONE',
          escalationClearedAt: now,
          updatedAt: now,
          lastActivityAt: now,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.escalation_cleared',
          description: dto.note ?? 'Escalation cleared',
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_ESCALATION_CLEARED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        idempotencyKey: `ticket.escalation_cleared:${ticketId}:${now.getTime()}`,
        data: { ticketId, ticketNumber: access.ticket.ticketNumber },
      });

      return this.reload(tx, ticketId);
    });
  }

  /** Adds a public comment or (staff-only) an internal note. */
  async addComment(
    actor: ActorContext,
    ticketId: string,
    dto: AddCommentDto,
  ): Promise<unknown> {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanRead(actor, access);

    const isInternal = dto.isInternal === true;
    if (isInternal) {
      this.authz.assertCanCommentInternal(actor);
    }

    if (
      (
        [TicketStatus.CLOSED, TicketStatus.CANCELLED] as TicketStatus[]
      ).includes(access.ticket.status)
    ) {
      throw new ConflictException(
        `A ${access.ticket.status} ticket cannot receive new comments`,
      );
    }

    const now = new Date();

    return this.uow.run(async (tx) => {
      const comment = await tx.ticketComment.create({
        data: {
          ticketId,
          userId: actor.userId,
          content: dto.content.trim(),
          isInternal,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: { lastActivityAt: now, updatedAt: now },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.comment_added',
          description: isInternal ? 'Internal note added' : 'Comment added',
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      const commentEventData = {
        ticketId,
        ticketNumber: access.ticket.ticketNumber,
        commentId: comment.id,
        isInternal,
        requesterId: access.ticket.requesterId,
        assignedAgentId: access.ticket.assignedAgentId,
      };

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_COMMENT_ADDED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        idempotencyKey: `ticket.comment_added:${comment.id}`,
        data: commentEventData,
      });

      await this.ticketNotifications.dispatch(tx, {
        eventType: DOMAIN_EVENTS.TICKET_COMMENT_ADDED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        data: commentEventData,
      });

      return comment;
    });
  }

  /**
   * Registers an attachment on a ticket.
   *
   * The file bytes are uploaded directly to object storage by the
   * client (pre-signed URL); this endpoint only records the
   * reference, which keeps request sizes bounded. Any participant
   * may attach — clients to their own tickets, staff to any
   * ticket in the organization.
   */
  async addAttachment(
    actor: ActorContext,
    ticketId: string,
    dto: AddAttachmentDto,
  ): Promise<TicketAttachment> {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanRead(actor, access);

    if (
      (
        [TicketStatus.CLOSED, TicketStatus.CANCELLED] as TicketStatus[]
      ).includes(access.ticket.status)
    ) {
      throw new ConflictException(
        `A ${access.ticket.status} ticket cannot receive attachments`,
      );
    }

    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new BadRequestException(
        `Files of type ${dto.mimeType} cannot be attached`,
      );
    }
    if (dto.fileSize > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException(
        `Attachments may not exceed ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB`,
      );
    }

    const now = new Date();
    const correlationId = randomUUID();

    return this.uow.run(async (tx) => {
      const attachment = await tx.ticketAttachment.create({
        data: {
          ticketId,
          uploadedBy: actor.userId,
          fileName: dto.fileName.trim(),
          fileUrl: dto.fileUrl.trim(),
          fileSize: dto.fileSize,
          mimeType: dto.mimeType,
        },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: { lastActivityAt: now, updatedAt: now },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.attachment_added',
          description: `Attachment added: ${attachment.fileName}`,
          metadata: {
            attachmentId: attachment.id,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
          },
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_UPDATED,
        entityType: 'TicketAttachment',
        entityId: attachment.id,
        actor,
        after: {
          ticketId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
        },
      });

      const attachmentEventData = {
        ticketId,
        ticketNumber: access.ticket.ticketNumber,
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
      };

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_ATTACHMENT_ADDED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.attachment_added:${attachment.id}`,
        data: attachmentEventData,
      });

      await this.ticketNotifications.dispatch(tx, {
        eventType: DOMAIN_EVENTS.TICKET_ATTACHMENT_ADDED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        data: attachmentEventData,
      });

      return attachment;
    });
  }

  /**
   * Removes an attachment. The uploader may remove their own
   * upload; staff may remove any attachment on a ticket they
   * can see. Rows are hard-deleted (the model keeps no
   * soft-delete columns); the audit trail preserves the fact.
   */
  async removeAttachment(
    actor: ActorContext,
    ticketId: string,
    attachmentId: string,
  ): Promise<{ id: string }> {
    const access = await this.loadWithAccess(actor, ticketId);
    await this.authz.assertCanRead(actor, access);

    const isStaff = actor.isSuperAdmin || actor.isAdmin || actor.isAgent;

    return this.uow.run(async (tx) => {
      const attachment = await tx.ticketAttachment.findFirst({
        where: { id: attachmentId, ticketId },
      });
      if (!attachment) {
        throw new NotFoundException('Attachment not found');
      }

      if (attachment.uploadedBy !== actor.userId && !isStaff) {
        throw new ForbiddenException(
          'Only the uploader or staff can remove this attachment',
        );
      }

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.attachment_removed',
          description: `Attachment removed: ${attachment.fileName}`,
          metadata: { attachmentId: attachment.id },
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_UPDATED,
        entityType: 'TicketAttachment',
        entityId: attachment.id,
        actor,
        before: {
          ticketId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
        },
      });

      await tx.ticketAttachment.delete({
        where: { id: attachment.id },
      });

      return { id: attachment.id };
    });
  }

  /** Staff-only metadata update (triage). */
  async update(
    actor: ActorContext,
    ticketId: string,
    dto: UpdateTicketDto,
  ): Promise<TicketWithAccess> {
    const access = await this.loadWithAccess(actor, ticketId);
    if (!actor.isSuperAdmin && !actor.isAdmin && !actor.isAgent) {
      throw new ForbiddenException('You are not allowed to edit this ticket');
    }

    const now = new Date();
    const correlationId = randomUUID();

    return this.uow.run(async (tx) => {
      const departmentId =
        dto.departmentId !== undefined
          ? await this.departments.assertInOrg(
              tx,
              dto.departmentId,
              access.ticket.organizationId,
            )
          : undefined;

      if (dto.projectId) {
        const project = await tx.project.findFirst({
          where: {
            id: dto.projectId,
            organizationId: access.ticket.organizationId,
            ...(access.ticket.clientId
              ? { clientId: access.ticket.clientId }
              : {}),
          },
          select: { id: true },
        });
        if (!project) throw new NotFoundException('Project not found');
      }

      // Changing priority can change which SLA policy applies, so recompute the
      // resolution deadline from the effective priority.
      let slaData: Prisma.TicketUpdateInput = {};
      if (dto.priority && dto.priority !== access.ticket.priority) {
        const effectiveDepartment = departmentId ?? access.ticket.departmentId;
        const policy = await this.slaPolicies.resolvePolicy(
          access.ticket.organizationId,
          {
            ticketType: access.ticket.type,
            category:
              (dto.category as TicketCategory) ?? access.ticket.category,
            priority: dto.priority,
            departmentId: effectiveDepartment,
          },
        );
        const deadlines = this.slaEngine.computeDeadlines(policy ?? null, now);
        slaData = {
          ...(policy ? { slaPolicy: { connect: { id: policy.id } } } : {}),
          resolutionDeadline: deadlines.resolutionDeadline,
          slaResolutionWarnedAt: null,
        };
      }

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.category !== undefined
            ? { category: dto.category as TicketCategory }
            : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
          ...(departmentId !== undefined ? { departmentId } : {}),
          ...slaData,
          updatedAt: now,
          lastActivityAt: now,
        } as Prisma.XOR<
          Prisma.TicketUpdateInput,
          Prisma.TicketUncheckedUpdateInput
        >,
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: actor.userId,
          action: 'ticket.updated',
          description: 'Ticket details updated',
          metadata: { fields: Object.keys(dto) },
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });

      await this.audit.record(tx, {
        organizationId: access.ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_UPDATED,
        entityType: 'Ticket',
        entityId: ticketId,
        actor,
        before: ticketSnapshot(access.ticket),
        after: ticketSnapshot(updated),
        metadata: { fields: Object.keys(dto) },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_UPDATED,
        organizationId: access.ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.updated:${ticketId}:${updated.updatedAt.getTime()}`,
        data: { ticketId, ticketNumber: access.ticket.ticketNumber },
      });

      return this.reload(tx, ticketId);
    });
  }

  // ==========================================================================
  // Internals
  // ==========================================================================

  /**
   * Single choke point for every status change.
   *
   * Validates the move against the state machine, writes the ticket row, keeps
   * the SLA pause state consistent, records the timeline entry, and publishes
   * the event — all inside the caller's transaction.
   */
  private async transition(
    actor: ActorContext,
    access: TicketAccessContext,
    to: TicketStatus,
    description: string,
    correlationId = randomUUID(),
  ): Promise<TicketWithAccess> {
    return this.uow.run(async (tx) => {
      await this.applyStatusChange(
        tx,
        access.ticket,
        to,
        actor,
        access.capabilities,
        correlationId,
        { reason: description },
      );
      await tx.ticketActivity.create({
        data: {
          ticketId: access.ticket.id,
          userId: actor.userId,
          action: 'ticket.status_changed',
          description,
          metadata: { from: access.ticket.status, to },
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });
      return this.reload(tx, access.ticket.id);
    });
  }

  private async applyStatusChange(
    tx: Tx,
    ticket: {
      id: string;
      organizationId: string;
      ticketNumber: string;
      status: TicketStatus;
      type: TicketType;
      firstRespondedAt?: Date | null;
      assignedAgentId?: string | null;
      requesterId?: string;
      clientId?: string | null;
    },
    to: TicketStatus,
    actor: ActorContext,
    capabilities: readonly TicketCapability[],
    correlationId: string,
    options: {
      reason: string;
      /** Skip the timeline/event write when the caller writes its own. */
      silent?: boolean;
    },
    extraData: Prisma.TicketUpdateInput = {},
  ): Promise<TicketWithAccess & { status: TicketStatus }> {
    const from = ticket.status;

    try {
      assertTransition(from, to, capabilities, ticket.type);
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }

    // NOTE: `applyStatusChange` is called from inside a transaction that the
    // caller owns. Every statement below uses `tx`, never `this.prisma`.
    const now = new Date();

    // First response stops the response clock. Emitted once.
    let firstResponseData: Prisma.TicketUpdateInput = {};
    const isFirstResponse =
      [
        'ASSIGNED',
        'IN_PROGRESS',
        'WAITING_FOR_CLIENT',
        'WAITING_FOR_EMPLOYEE',
      ].includes(to) &&
      !(ticket as { firstRespondedAt?: Date | null }).firstRespondedAt;
    if (isFirstResponse) {
      firstResponseData = { firstRespondedAt: now };
    }

    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: to,
        updatedAt: now,
        lastActivityAt: now,
        ...firstResponseData,
        ...extraData,
      },
    });

    // Keep the SLA pause state consistent with the new status. Both branches
    // are idempotent, so this is safe on every transition.
    await this.slaEngine.syncPauseStateForStatus(tx, ticket.id, to, now);

    if (!options.silent) {
      await this.audit.record(tx, {
        organizationId: ticket.organizationId,
        action: AUDIT_ACTIONS.TICKET_STATUS_CHANGED,
        entityType: 'Ticket',
        entityId: ticket.id,
        actor,
        before: { status: from },
        after: { status: to },
        metadata: { reason: options.reason },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.TICKET_STATUS_CHANGED,
        organizationId: ticket.organizationId,
        actorId: actor.userId,
        correlationId,
        idempotencyKey: `ticket.status_changed:${ticket.id}:${from}->${to}:${now.getTime()}`,
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          from,
          to,
          reason: options.reason,
          requesterId: ticket.requesterId ?? null,
          assignedAgentId: ticket.assignedAgentId ?? null,
        },
      });
    }

    return updated;
  }

  /**
   * Role-derived capabilities for operations that only staff can perform
   * (assignment, SLA management). Object-level capabilities such as
   * `requester` / `assignee` come from {@link TicketAccessContext} instead.
   */
  private staffCapabilities(actor: ActorContext): TicketCapability[] {
    const capabilities: TicketCapability[] = [];
    if (actor.isSuperAdmin) capabilities.push('superAdmin');
    if (actor.isAdmin) capabilities.push('admin');
    if (actor.isAgent) capabilities.push('agent');
    return capabilities;
  }

  private async loadWithAccess(
    actor: ActorContext,
    ticketId: string,
  ): Promise<TicketAccessContext> {
    const ticket = await this.authz.loadVisibleTicket(actor, ticketId);
    return this.authz.resolveAccess(actor, ticket);
  }

  private async reload(tx: Tx, ticketId: string): Promise<TicketWithAccess> {
    return await tx.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
  }

  /** Builds the tenant + role scoped `where` clause for list queries. */
  // ==========================================================================
  // Summary / Stats
  // ==========================================================================

  /**
   * Returns per-status ticket counts for the actor's visible scope.
   * Clients see their own org tickets, employees see own/assigned,
   * agents and admins see the full org.
   */
  async summary(actor: ActorContext): Promise<Record<string, number>> {
    const baseWhere = await this.buildListWhere({} as any, actor);

    const [
      total,
      open,
      assigned,
      inProgress,
      waitingForClient,
      waitingForEmployee,
      resolutionSubmitted,
      underVerification,
      reopened,
      resolved,
      closed,
      cancelled,
      escalated,
      slaBreached,
      unassigned,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: baseWhere }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'OPEN' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'ASSIGNED' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'WAITING_FOR_CLIENT' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'WAITING_FOR_EMPLOYEE' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'RESOLUTION_SUBMITTED' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'UNDER_VERIFICATION' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'REOPENED' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'RESOLVED' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'CLOSED' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
      this.prisma.ticket.count({ where: { ...baseWhere, escalationLevel: { not: 'NONE' } } }),
      this.prisma.ticket.count({
        where: {
          ...baseWhere,
          OR: [
            { slaResponseBreachedAt: { not: null } },
            { slaResolutionBreachedAt: { not: null } },
          ],
        },
      }),
      this.prisma.ticket.count({
        where: { ...baseWhere, assignments: { none: { isActive: true } } },
      }),
    ]);

    return {
      total,
      open,
      assigned,
      inProgress,
      waitingForClient,
      waitingForEmployee,
      resolutionSubmitted,
      underVerification,
      reopened,
      resolved,
      closed,
      cancelled,
      escalated,
      slaBreached,
      unassigned,
    };
  }

  private async buildListWhere(
    query: TicketQueryDto,
    actor: ActorContext,
  ): Promise<Prisma.TicketWhereInput> {
    const where: Prisma.TicketWhereInput = {
      // Tenant isolation is unconditional and derived from the JWT.
      organizationId: actor.organizationId,
    };

    // --- role scoping ---
    if (actor.isClient) {
      if (!actor.linkedClientId) {
        // A client user with no linked client can see nothing at all.
        return { id: '__no_client_link__' };
      }
      where.clientId = actor.linkedClientId;
    } else if (!actor.isAdmin && !actor.isAgent) {
      // Employees: own requests OR currently assigned.
      const employee = await this.prisma.employee.findUnique({
        where: { userId: actor.userId },
        select: { id: true },
      });
      if (!employee) {
        where.requesterId = actor.userId;
      } else {
        where.OR = [
          { requesterId: actor.userId },
          {
            assignments: { some: { employeeId: employee.id, isActive: true } },
          },
        ];
      }
    }

    if (query.status) {
      const statuses = query.status
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean) as TicketStatus[];
      if (statuses.length > 0) where.status = { in: statuses };
    }
    if (query.priority) {
      const priorities = query.priority
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean) as TicketPriority[];
      if (priorities.length > 0) where.priority = { in: priorities };
    }
    if (query.type) where.type = query.type as TicketType;
    if (query.category) where.category = query.category as TicketCategory;
    if (query.clientId) where.clientId = query.clientId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.assignedAgentId) where.assignedAgentId = query.assignedAgentId;

    if (query.employeeId) {
      where.assignments = {
        some: { employeeId: query.employeeId, isActive: true },
      };
    }

    if (query.escalatedOnly === 'true') {
      where.escalationLevel = { not: 'NONE' };
    }

    if (query.slaState === 'breached') {
      where.OR = [
        ...(where.OR ?? []),
        { slaResponseBreachedAt: { not: null } },
        { slaResolutionBreachedAt: { not: null } },
      ];
    } else if (query.slaState === 'warning') {
      where.slaResponseWarnedAt = { not: null };
    } else if (query.slaState === 'paused') {
      where.slaPausedAt = { not: null };
    }

    if (query.scope) {
      if (query.scope === 'unassigned') {
        where.assignments = { none: { isActive: true } };
      } else if (query.scope === 'mine' || query.scope === 'assigned') {
        const employee = await this.prisma.employee.findUnique({
          where: { userId: actor.userId },
          select: { id: true },
        });
        if (!employee) {
          return { id: '__no_employee__' };
        }
        where.assignments = {
          some: { employeeId: employee.id, isActive: true },
        };
      }
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        ...(where.OR ?? []),
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    query: TicketQueryDto,
  ): Prisma.TicketOrderByWithRelationInput[] {
    const direction: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';

    const allowed: Record<string, Prisma.TicketOrderByWithRelationInput> = {
      createdAt: { createdAt: direction },
      updatedAt: { updatedAt: direction },
      lastActivityAt: { lastActivityAt: direction },
      priority: { priority: direction },
      status: { status: direction },
      resolutionDeadline: { resolutionDeadline: direction },
      firstResponseDeadline: { firstResponseDeadline: direction },
    };

    // Default ordering surfaces the most actionable work first.
    return query.sortBy && allowed[query.sortBy]
      ? [allowed[query.sortBy], { createdAt: 'desc' }]
      : [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }];
  }

  /** Collision-resistant, non-sequential reference. */
  private generateReference(): string {
    let reference = '';
    for (let index = 0; index < 6; index += 1) {
      reference +=
        REFERENCE_ALPHABET[
          Math.floor(Math.random() * REFERENCE_ALPHABET.length)
        ];
    }
    return reference;
  }
}
