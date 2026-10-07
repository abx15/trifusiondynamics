import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SLAPolicy,
  TicketCategory,
  TicketPriority,
  TicketType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  UnitOfWorkService,
  Tx,
} from '../../../common/prisma/unit-of-work.service';
import { ActorContext } from '../../../common/auth/actor.decorator';
import {
  AUDIT_ACTIONS,
  AuditService,
} from '../../../common/audit/audit.service';
import { OutboxPublisher } from '../../../common/events/outbox.publisher';
import { DOMAIN_EVENTS } from '../../../common/events/domain-event.interface';
import {
  PaginatedResult,
  paginatedResult,
  parsePagination,
} from '../../../common/utils/pagination';
import { CreateSlaPolicyDto, UpdateSlaPolicyDto } from './dto/sla-policy.dto';
import { pickMostSpecific } from '../routing/routing-matcher';

export interface SlaCriteria {
  ticketType: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  departmentId?: string | null;
}

@Injectable()
export class SlaPoliciesService {
  private readonly logger = new Logger(SlaPoliciesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWorkService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxPublisher,
  ) {}

  /**
   * Deterministic policy selection.
   *
   * 1. Load the tenant's active policies.
   * 2. Keep the ones whose declared criteria match the ticket.
   *    (ticketType and priority are REQUIRED on a policy, so they always
   *    constrain the match; category and departmentId are optional.)
   * 3. Rank by specificity score, then policyOrder, then createdAt, then id —
   *    a total order, so the same inputs always yield the same policy.
   * 4. If nothing matched, fall back to the organization's `isDefault` policy.
   *
   * Returns null when the organization has no policy at all; the ticket is then
   * created without SLA tracking rather than with an invented deadline.
   */
  async resolvePolicy(
    organizationId: string,
    criteria: SlaCriteria,
  ): Promise<SLAPolicy | null> {
    const policies = await this.prisma.sLAPolicy.findMany({
      where: { organizationId, isActive: true },
      take: 500,
    });

    if (policies.length === 0) return null;

    const exact = pickMostSpecific(
      policies.filter((policy) => !policy.isDefault),
      {
        ticketType: criteria.ticketType,
        category: criteria.category,
        priority: criteria.priority,
        departmentId: criteria.departmentId ?? null,
      },
      (p) => p.policyOrder,
    );
    if (exact) return exact;

    const fallback = policies
      .filter((policy) => policy.isDefault)
      .sort((a, b) => {
        const orderDiff = b.policyOrder - a.policyOrder;
        if (orderDiff !== 0) return orderDiff;
        const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
        if (createdDiff !== 0) return createdDiff;
        return a.id.localeCompare(b.id);
      })[0];

    if (fallback) {
      this.logger.debug(
        `Using default SLA policy "${fallback.name}" for org=${organizationId}`,
      );
    }
    return fallback ?? null;
  }

  async list(
    actor: ActorContext,
    options: { includeInactive?: boolean; page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<SLAPolicy>> {
    const { skip, take, page, limit } = parsePagination(
      options.page,
      options.limit,
    );
    const where: Prisma.SLAPolicyWhereInput = {
      organizationId: actor.organizationId,
      ...(options.includeInactive ? {} : { isActive: true }),
    };

    const [total, policies] = await Promise.all([
      this.prisma.sLAPolicy.count({ where }),
      this.prisma.sLAPolicy.findMany({
        where,
        skip,
        take,
        orderBy: [{ policyOrder: 'desc' }, { name: 'asc' }],
        include: {
          department: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    return paginatedResult(policies, total, page, limit);
  }

  async findById(id: string, actor: ActorContext): Promise<SLAPolicy> {
    const policy = await this.prisma.sLAPolicy.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: { department: { select: { id: true, code: true, name: true } } },
    });
    if (!policy) {
      throw new NotFoundException('SLA policy not found');
    }
    return policy;
  }

  async create(
    dto: CreateSlaPolicyDto,
    actor: ActorContext,
  ): Promise<SLAPolicy> {
    return this.uow.run(async (tx) => {
      const departmentId = await this.assertDepartment(
        tx,
        dto.departmentId,
        actor,
      );

      const existing = await tx.sLAPolicy.findFirst({
        where: { organizationId: actor.organizationId, name: dto.name.trim() },
      });
      if (existing) {
        throw new ConflictException(
          'An SLA policy with that name already exists in this organization',
        );
      }

      if (dto.isDefault) {
        await tx.sLAPolicy.updateMany({
          where: { organizationId: actor.organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const policy = await tx.sLAPolicy.create({
        data: {
          organizationId: actor.organizationId,
          name: dto.name.trim(),
          description: dto.description ?? null,
          departmentId,
          ticketType: dto.ticketType,
          category: dto.category ?? null,
          priority: dto.priority,
          responseTimeMins: dto.responseTimeMins,
          resolutionTimeMins: dto.resolutionTimeMins,
          warningThresholdPercent: dto.warningThresholdPercent ?? 80,
          policyOrder: dto.policyOrder ?? 0,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
        },
      });

      await this.audit.record(tx, {
        organizationId: actor.organizationId,
        action: AUDIT_ACTIONS.SLA_POLICY_CREATED,
        entityType: 'SLAPolicy',
        entityId: policy.id,
        actor,
        after: {
          name: policy.name,
          ticketType: policy.ticketType,
          priority: policy.priority,
          responseTimeMins: policy.responseTimeMins,
          resolutionTimeMins: policy.resolutionTimeMins,
        },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.SLA_POLICY_CREATED,
        organizationId: actor.organizationId,
        actorId: actor.userId,
        idempotencyKey: `sla_policy.created:${policy.id}`,
        data: {
          id: policy.id,
          name: policy.name,
          organizationId: policy.organizationId,
          description: policy.description,
          departmentId: policy.departmentId,
          ticketType: policy.ticketType,
          category: policy.category,
          priority: policy.priority,
          responseTimeMins: policy.responseTimeMins,
          resolutionTimeMins: policy.resolutionTimeMins,
          warningThresholdPercent: policy.warningThresholdPercent,
          policyOrder: policy.policyOrder,
          isDefault: policy.isDefault,
          isActive: policy.isActive,
        },
      });

      return policy;
    });
  }

  async update(
    id: string,
    dto: UpdateSlaPolicyDto,
    actor: ActorContext,
  ): Promise<SLAPolicy> {
    const existing = await this.prisma.sLAPolicy.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!existing) {
      throw new NotFoundException('SLA policy not found');
    }

    return this.uow.run(async (tx) => {
      const departmentId =
        dto.departmentId !== undefined
          ? await this.assertDepartment(tx, dto.departmentId, actor)
          : undefined;

      if (dto.isDefault) {
        await tx.sLAPolicy.updateMany({
          where: { organizationId: actor.organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const updated = await tx.sLAPolicy.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(departmentId !== undefined ? { departmentId } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.responseTimeMins !== undefined
            ? { responseTimeMins: dto.responseTimeMins }
            : {}),
          ...(dto.resolutionTimeMins !== undefined
            ? { resolutionTimeMins: dto.resolutionTimeMins }
            : {}),
          ...(dto.warningThresholdPercent !== undefined
            ? { warningThresholdPercent: dto.warningThresholdPercent }
            : {}),
          ...(dto.policyOrder !== undefined
            ? { policyOrder: dto.policyOrder }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });

      await this.audit.record(tx, {
        organizationId: actor.organizationId,
        action: AUDIT_ACTIONS.SLA_POLICY_UPDATED,
        entityType: 'SLAPolicy',
        entityId: id,
        actor,
        before: {
          responseTimeMins: existing.responseTimeMins,
          resolutionTimeMins: existing.resolutionTimeMins,
          isActive: existing.isActive,
        },
        after: {
          responseTimeMins: updated.responseTimeMins,
          resolutionTimeMins: updated.resolutionTimeMins,
          isActive: updated.isActive,
        },
        // Changing a policy does not retroactively rewrite deadlines on tickets
        // already in flight; the fact is recorded so operators can see it.
        metadata: {
          note: 'Existing ticket deadlines are not recomputed on policy change',
        },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.SLA_POLICY_UPDATED,
        organizationId: actor.organizationId,
        actorId: actor.userId,
        idempotencyKey: `sla_policy.updated:${updated.id}:${updated.updatedAt.getTime()}`,
        data: {
          id: updated.id,
          name: updated.name,
          organizationId: updated.organizationId,
          description: updated.description,
          departmentId: updated.departmentId,
          ticketType: updated.ticketType,
          category: updated.category,
          priority: updated.priority,
          responseTimeMins: updated.responseTimeMins,
          resolutionTimeMins: updated.resolutionTimeMins,
          warningThresholdPercent: updated.warningThresholdPercent,
          policyOrder: updated.policyOrder,
          isDefault: updated.isDefault,
          isActive: updated.isActive,
        },
      });

      return updated;
    });
  }

  private async assertDepartment(
    tx: Tx,
    departmentId: string | null | undefined,
    actor: ActorContext,
  ): Promise<string | null> {
    if (!departmentId) return null;
    const found = await tx.department.findFirst({
      where: { id: departmentId, organizationId: actor.organizationId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Department not found');
    return found.id;
  }
}
