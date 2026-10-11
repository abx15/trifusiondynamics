import { Controller, Get, UseGuards, ForbiddenException, Param, Query, Patch, Body, Post, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../database/redis.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkflowEngineService } from '../automation/engine/workflow-engine.service';
import { TriggerType } from '../automation/dto/create-workflow.dto';

function isSuperAdminUser(user: JwtPayload): boolean {
  const roles = user?.roles || [];
  return roles.some((r) =>
    ['superadmin', 'super_admin'].includes(r.toLowerCase()),
  );
}

@Controller('super-admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuperAdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can access global platform stats',
      );
    }
    return this.usersService.getSuperAdminStats();
  }

  @Get('telemetry')
  async getTelemetry(@CurrentUser() user: JwtPayload) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can access live system telemetry',
      );
    }

    // 1. PostgreSQL latency
    let pgLatency = 0;
    let pgStatus = 'Healthy';
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      pgLatency = Date.now() - start;
    } catch (e) {
      pgStatus = 'Unavailable';
    }

    // 2. Redis latency
    let redisLatency = 0;
    let redisStatus = 'Healthy';
    try {
      const start = Date.now();
      const redisOk = await this.redis.ping();
      redisLatency = Date.now() - start;
      if (!redisOk) redisStatus = 'Degraded';
    } catch (e) {
      redisStatus = 'Degraded';
    }

    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr = `${days > 0 ? `${days}d ` : ''}${hours}h ${mins}m`;

    return {
      clusterStatus: pgStatus === 'Healthy' ? 'Healthy' : 'Degraded',
      services: [
        {
          name: 'Authentication Microservice (NestJS)',
          port: '8000',
          status: 'Healthy',
          latency: `${Math.max(1, pgLatency)}ms`,
          uptime: uptimeStr,
          type: 'Core Auth & RBAC',
        },
        {
          name: 'Admin Dashboard (Next.js)',
          port: '3001',
          status: 'Healthy',
          latency: '6ms',
          uptime: uptimeStr,
          type: 'SSR & Unified Client Portal',
        },
        {
          name: 'Agency Web Landing (Next.js)',
          port: '3000',
          status: 'Healthy',
          latency: '8ms',
          uptime: uptimeStr,
          type: 'Public Website & CMS',
        },
        {
          name: 'AI Copilot Engine (FastAPI / Python)',
          port: '8001',
          status: process.env.AI_SERVICE_URL ? 'Operational' : 'Disabled',
          latency: '24ms',
          uptime: uptimeStr,
          type: 'LLM Orchestration',
        },
      ],
      infrastructure: {
        database: {
          engine: 'Neon PostgreSQL (Cloud)',
          status: pgStatus,
          latency: `${pgLatency}ms`,
        },
        redis: {
          engine: 'Upstash / Redis Cloud',
          status: redisStatus,
          latency: `${redisLatency}ms`,
        },
        memoryUsage: process.memoryUsage(),
      },
    };
  }

  @Get('organizations/:id')
  @RequirePermission('hr:read')
  async getOrganizationDetails(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can access organization details',
      );
    }
    return this.usersService.getOrganizationDetails(id);
  }

  @Patch('organizations/:id/reactivate')
  @RequirePermission('users:write')
  async reactivateOrganization(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can reactivate organizations',
      );
    }
    return this.usersService.reactivateOrganization(id, {
      id: user.sub,
      email: user.email,
      roles: user.roles,
    });
  }

  @Get('automation/overview')
  @RequirePermission('automation:read')
  async getAutomationOverview(@CurrentUser() user: JwtPayload) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can access global automation overview',
      );
    }

    const [totalWorkflows, activeWorkflows, totalRuns, recentRuns] = await Promise.all([
      this.prisma.workflow.count(),
      this.prisma.workflow.count({ where: { isActive: true } }),
      this.prisma.workflowRun.count(),
      this.prisma.workflowRun.findMany({
        take: 20,
        orderBy: { startedAt: 'desc' },
        include: {
          workflow: { select: { id: true, name: true, organizationId: true } },
        },
      }),
    ]);

    const runsByStatus = await this.prisma.workflowRun.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const runsByOrg = await this.prisma.workflowRun.groupBy({
      by: ['workflowId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return {
      totalWorkflows,
      activeWorkflows,
      totalRuns,
      runsByStatus: runsByStatus.map(r => ({ status: r.status, count: r._count.id })),
      topWorkflowsByRuns: runsByOrg,
      recentRuns,
    };
  }

  @Get('automation/workflows')
  @RequirePermission('automation:read')
  async getAllWorkflows(@CurrentUser() user: JwtPayload) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can list workflows across all organizations',
      );
    }

    const [workflows, runCounts, orgs] = await Promise.all([
      this.prisma.workflow.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          runs: {
            orderBy: { startedAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.workflowRun.groupBy({
        by: ['workflowId'],
        _count: { id: true },
      }),
      this.prisma.organization.findMany({
        select: { id: true, name: true, slug: true, isActive: true },
      }),
    ]);

    const runCountMap = new Map(runCounts.map((r) => [r.workflowId, r._count.id]));
    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    return workflows.map((w) => ({
      id: w.id,
      name: w.name,
      triggerType: w.triggerType,
      triggerConfig: w.triggerConfig,
      actions: w.actions,
      isActive: w.isActive,
      organizationId: w.organizationId,
      organization: orgMap.get(w.organizationId) || null,
      totalRuns: runCountMap.get(w.id) || 0,
      lastRun: w.runs[0] || null,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  @Patch('automation/workflows/:id/toggle')
  @RequirePermission('automation:write')
  async toggleWorkflow(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can toggle workflows across organizations',
      );
    }

    const workflow = await this.prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: { isActive: !workflow.isActive },
    });

    return {
      message: `Workflow "${workflow.name}" ${updated.isActive ? 'activated' : 'deactivated'}`,
      workflow: updated,
    };
  }

  @Post('automation/workflows/:id/trigger')
  @RequirePermission('automation:write')
  async triggerWorkflow(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can trigger workflows across organizations',
      );
    }

    const workflow = await this.prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (workflow.triggerType !== TriggerType.MANUAL) {
      throw new BadRequestException('Only MANUAL workflows can be triggered this way');
    }

    if (!workflow.isActive) {
      throw new BadRequestException('Cannot trigger an inactive workflow');
    }

    // Fire and forget — the engine records the run and executes actions
    this.workflowEngine
      .execute(workflow, { source: 'super_admin_manual_trigger' })
      .catch(console.error);

    return { message: 'Workflow triggered successfully' };
  }

  @Get('organizations/:id/automation')
  @RequirePermission('automation:read')
  async getOrganizationAutomation(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can access organization automation stats',
      );
    }

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const [workflows, totalRuns, runsByStatus] = await Promise.all([
      this.prisma.workflow.findMany({
        where: { organizationId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.workflowRun.count({
        where: { workflow: { organizationId: id } },
      }),
      this.prisma.workflowRun.groupBy({
        by: ['status'],
        where: { workflow: { organizationId: id } },
        _count: { id: true },
      }),
    ]);

    return {
      organization: { id: org.id, name: org.name, slug: org.slug, isActive: org.isActive },
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter((w) => w.isActive).length,
      totalRuns,
      runsByStatus: runsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
      workflows,
    };
  }

  @Get('ai/overview')
  @RequirePermission('ai:read')
  async getAiOverview(@CurrentUser() user: JwtPayload) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can access global AI overview',
      );
    }

    const [totalProposals, totalAudits, totalEmails, totalSummaries] = await Promise.all([
      this.prisma.aiProposalRequest.count(),
      this.prisma.aiSeoAudit.count(),
      this.prisma.aiEmailDraft.count(),
      this.prisma.aiMeetingSummary.count(),
    ]);

    const proposalsByOrg = await this.prisma.aiProposalRequest.groupBy({
      by: ['organizationId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const auditsByOrg = await this.prisma.aiSeoAudit.groupBy({
      by: ['organizationId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const recentProposals = await this.prisma.aiProposalRequest.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const recentAudits = await this.prisma.aiSeoAudit.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalProposals,
      totalAudits,
      totalEmails,
      totalSummaries,
      proposalsByOrg,
      auditsByOrg,
      recentProposals,
      recentAudits,
    };
  }

  @Get('ticketing/overview')
  @RequirePermission('helpdesk:read')
  async getTicketingOverview(@CurrentUser() user: JwtPayload) {
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Only super administrators can access global ticketing overview',
      );
    }

    const [totalTickets, openTickets, resolvedTickets, slaBreached] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      this.prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.ticket.count({ where: { slaResolutionBreachedAt: { not: null } } }),
    ]);

    const ticketsByOrg = await this.prisma.ticket.groupBy({
      by: ['organizationId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const ticketsByStatus = await this.prisma.ticket.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const ticketsByPriority = await this.prisma.ticket.groupBy({
      by: ['priority'],
      _count: { id: true },
    });

    const avgResolutionTime = await this.prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")))::float as avg_seconds
      FROM helpdesk."Ticket"
      WHERE "resolvedAt" IS NOT NULL
    ` as { avg_seconds: number }[];

    return {
      totalTickets,
      openTickets,
      resolvedTickets,
      slaBreached,
      avgResolutionTimeHours: avgResolutionTime[0]?.avg_seconds ? Math.round(avgResolutionTime[0].avg_seconds / 3600) : 0,
      ticketsByOrg,
      ticketsByStatus: ticketsByStatus.map(t => ({ status: t.status, count: t._count.id })),
      ticketsByPriority: ticketsByPriority.map(t => ({ priority: t.priority, count: t._count.id })),
    };
  }
}
