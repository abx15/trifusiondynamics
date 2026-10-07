import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RoutingRule,
  TicketCategory,
  TicketPriority,
  TicketType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWorkService } from '../../../common/prisma/unit-of-work.service';
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
import {
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
} from './dto/routing-rule.dto';
import { pickMostSpecific } from './routing-matcher';

export interface RoutingCriteria {
  ticketType: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  departmentId?: string | null;
}

@Injectable()
export class RoutingRulesService {
  private readonly logger = new Logger(RoutingRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWorkService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxPublisher,
  ) {}

  /**
   * Resolves the department / agent / auto-assign employee / SLA policy for a
   * new ticket.
   *
   * The mapping is entirely data-driven: nothing in this method contains a
   * department name or code. If no rule matches, the ticket is still created
   * and simply stays unrouted, which is visible to operators instead of being
   * silently misrouted by a hardcoded default.
   */
  async resolve(
    organizationId: string,
    criteria: RoutingCriteria,
  ): Promise<{
    rule: RoutingRule | null;
    departmentId: string | null;
    defaultAgentId: string | null;
    autoAssignEmployeeId: string | null;
    slaPolicyId: string | null;
  }> {
    const rules = await this.prisma.routingRule.findMany({
      where: { organizationId, isActive: true },
      take: 500,
    });

    const best = pickMostSpecific(rules, criteria, (r) => r.ruleOrder);
    if (!best) {
      this.logger.debug(
        `No routing rule matched for org=${organizationId} type=${criteria.ticketType} category=${criteria.category} priority=${criteria.priority}`,
      );
      return {
        rule: null,
        departmentId: null,
        defaultAgentId: null,
        autoAssignEmployeeId: null,
        slaPolicyId: null,
      };
    }

    return {
      rule: best,
      departmentId: best.departmentId,
      defaultAgentId: best.defaultAgentId,
      autoAssignEmployeeId: best.autoAssignEmployeeId,
      slaPolicyId: best.slaPolicyId,
    };
  }

  async list(
    actor: ActorContext,
    options: { includeInactive?: boolean; page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<RoutingRule>> {
    const { skip, take, page, limit } = parsePagination(
      options.page,
      options.limit,
    );
    const where: Prisma.RoutingRuleWhereInput = {
      organizationId: actor.organizationId,
      ...(options.includeInactive ? {} : { isActive: true }),
    };

    const [total, rules] = await Promise.all([
      this.prisma.routingRule.count({ where }),
      this.prisma.routingRule.findMany({
        where,
        skip,
        take,
        orderBy: [{ ruleOrder: 'desc' }, { createdAt: 'asc' }],
        include: {
          department: { select: { id: true, code: true, name: true } },
          defaultAgent: { select: { id: true, name: true, email: true } },
          slaPolicy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return paginatedResult(rules, total, page, limit);
  }

  async findById(id: string, actor: ActorContext): Promise<RoutingRule> {
    const rule = await this.prisma.routingRule.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: {
        department: { select: { id: true, code: true, name: true } },
        defaultAgent: { select: { id: true, name: true, email: true } },
        autoAssignEmployee: { select: { id: true, employeeCode: true } },
        slaPolicy: { select: { id: true, name: true } },
      },
    });
    if (!rule) {
      throw new NotFoundException('Routing rule not found');
    }
    return rule;
  }

  async create(
    dto: CreateRoutingRuleDto,
    actor: ActorContext,
  ): Promise<RoutingRule> {
    return this.uow.run(async (tx) => {
      const data = await this.validateReferences(tx, dto, actor);

      const existing = await tx.routingRule.findFirst({
        where: { organizationId: actor.organizationId, name: dto.name.trim() },
      });
      if (existing) {
        throw new ConflictException(
          'A routing rule with that name already exists in this organization',
        );
      }

      if (dto.isDefault) {
        await tx.routingRule.updateMany({
          where: { organizationId: actor.organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const rule = await tx.routingRule.create({
        data: {
          ...data,
          organizationId: actor.organizationId,
          name: dto.name.trim(),
          ruleOrder: dto.ruleOrder ?? 0,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
        },
      });

      await this.audit.record(tx, {
        organizationId: actor.organizationId,
        action: AUDIT_ACTIONS.ROUTING_RULE_CREATED,
        entityType: 'RoutingRule',
        entityId: rule.id,
        actor,
        after: {
          name: rule.name,
          ticketType: rule.ticketType,
          category: rule.category,
          priority: rule.priority,
          departmentId: rule.departmentId,
          ruleOrder: rule.ruleOrder,
        },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.ROUTING_RULE_CREATED,
        organizationId: actor.organizationId,
        actorId: actor.userId,
        idempotencyKey: `routing_rule.created:${rule.id}`,
        data: {
          id: rule.id,
          name: rule.name,
          organizationId: rule.organizationId,
          ticketType: rule.ticketType,
          category: rule.category,
          priority: rule.priority,
          departmentId: rule.departmentId,
          defaultAgentId: rule.defaultAgentId,
          autoAssignEmployeeId: rule.autoAssignEmployeeId,
          slaPolicyId: rule.slaPolicyId,
          ruleOrder: rule.ruleOrder,
          isDefault: rule.isDefault,
          isActive: rule.isActive,
        },
      });

      return rule;
    });
  }

  async update(
    id: string,
    dto: UpdateRoutingRuleDto,
    actor: ActorContext,
  ): Promise<RoutingRule> {
    const existing = await this.prisma.routingRule.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!existing) {
      throw new NotFoundException('Routing rule not found');
    }

    return this.uow.run(async (tx) => {
      const data = await this.validateReferences(tx, dto, actor);

      if (dto.isDefault) {
        // The partial unique index allows only one default per organization, so
        // clear the incumbent first inside the same transaction.
        await tx.routingRule.updateMany({
          where: { organizationId: actor.organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const updated = await tx.routingRule.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...data,
          ...(dto.ruleOrder !== undefined ? { ruleOrder: dto.ruleOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });

      await this.audit.record(tx, {
        organizationId: actor.organizationId,
        action: AUDIT_ACTIONS.ROUTING_RULE_UPDATED,
        entityType: 'RoutingRule',
        entityId: id,
        actor,
        before: {
          name: existing.name,
          departmentId: existing.departmentId,
          ruleOrder: existing.ruleOrder,
          isActive: existing.isActive,
        },
        after: {
          name: updated.name,
          departmentId: updated.departmentId,
          ruleOrder: updated.ruleOrder,
          isActive: updated.isActive,
        },
      });

      await this.outbox.publish(tx, {
        eventType: DOMAIN_EVENTS.ROUTING_RULE_UPDATED,
        organizationId: actor.organizationId,
        actorId: actor.userId,
        idempotencyKey: `routing_rule.updated:${updated.id}:${updated.updatedAt.getTime()}`,
        data: {
          id: updated.id,
          name: updated.name,
          organizationId: updated.organizationId,
          ticketType: updated.ticketType,
          category: updated.category,
          priority: updated.priority,
          departmentId: updated.departmentId,
          defaultAgentId: updated.defaultAgentId,
          autoAssignEmployeeId: updated.autoAssignEmployeeId,
          slaPolicyId: updated.slaPolicyId,
          ruleOrder: updated.ruleOrder,
          isDefault: updated.isDefault,
          isActive: updated.isActive,
        },
      });

      return updated;
    });
  }

  /**
   * Verifies every referenced entity belongs to the actor's organization. This
   * is what stops a caller from pointing a routing rule at another tenant's
   * department or agent.
   */
  private async validateReferences(
    tx: import('../../../common/prisma/unit-of-work.service').Tx,
    dto: CreateRoutingRuleDto | UpdateRoutingRuleDto,
    actor: ActorContext,
  ): Promise<Prisma.RoutingRuleUncheckedCreateInput> {
    const out: Record<string, unknown> = {};

    for (const key of [
      'ticketType',
      'category',
      'priority',
      'departmentId',
      'defaultAgentId',
      'autoAssignEmployeeId',
      'slaPolicyId',
    ] as const) {
      if (!(key in dto)) continue;
      const value = dto[key] as string | null | undefined;
      if (!value) {
        out[key] = null;
        continue;
      }

      switch (key) {
        case 'departmentId': {
          const found = await tx.department.findFirst({
            where: {
              id: value,
              organizationId: actor.organizationId,
            },
            select: { id: true },
          });
          if (!found) throw new NotFoundException('Department not found');
          break;
        }
        case 'defaultAgentId': {
          const found = await tx.user.findFirst({
            where: {
              id: value,
              organizationId: actor.organizationId,
            },
            select: { id: true },
          });
          if (!found) throw new NotFoundException('Default agent not found');
          break;
        }
        case 'autoAssignEmployeeId': {
          const found = await tx.employee.findFirst({
            where: {
              id: value,
              organizationId: actor.organizationId,
              status: 'ACTIVE',
            },
            select: { id: true },
          });
          if (!found) {
            throw new NotFoundException('Active employee not found');
          }
          break;
        }
        case 'slaPolicyId': {
          const found = await tx.sLAPolicy.findFirst({
            where: {
              id: value,
              organizationId: actor.organizationId,
            },
            select: { id: true },
          });
          if (!found) throw new NotFoundException('SLA policy not found');
          break;
        }
        default:
          break;
      }

      out[key] = value;
    }

    return out as Prisma.RoutingRuleUncheckedCreateInput;
  }
}
