import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { LeadsService } from './leads.service';
import { InvoicesService } from './invoices.service';
import { TasksService } from './tasks.service';
import { PayslipsService } from './payslips.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { AdaptiveThrottle } from '../../common/decorators/adaptive-throttle.decorator';

@ApiTags('CRM / Operations')
@ApiBearerAuth()
@Controller()
export class StubsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly invoicesService: InvoicesService,
    private readonly tasksService: TasksService,
    private readonly payslipsService: PayslipsService,
  ) {}

  // CRM
  @Post('crm/leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  createLead(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.leadsService.createLead(body, user.orgId);
  }

  @Post('crm/leads/from-submission/:submissionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  promoteSubmissionToLead(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leadsService.promoteSubmissionToLead(submissionId, user.orgId);
  }

  @Get('crm/contact-submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getContactSubmissions(@Query() query: any, @CurrentUser() user: JwtPayload) {
    return this.leadsService.getSubmissions(user.orgId, query);
  }

  @Patch('crm/leads/:id/stage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  moveLeadStage(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leadsService.moveStage(id, body.stage, user.orgId);
  }

  @Post('crm/leads/:id/convert')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  convertLead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.leadsService.convertToClient(id, user.orgId);
  }

  // Billing
  @Post('billing/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('billing:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  createInvoice(@Body() body: any) {
    return this.invoicesService.createInvoice(body);
  }

  @Post('billing/invoices/:id/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('billing:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  recordPayment(@Param('id') id: string, @Body() body: any) {
    return this.invoicesService.recordPayment(id, body.amount);
  }

  // Projects
  @Post('projects/:id/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('projects:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  createTask(@Param('id') id: string, @Body() body: any) {
    return this.tasksService.createTask({ ...body, projectId: id });
  }

  @Patch('tasks/:id/move')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('projects:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  moveTask(@Param('id') id: string, @Body() body: any) {
    return this.tasksService.moveTask(id, body.status, body.order);
  }

  // Auth Stubs removed - use /api/auth routes from AuthController instead

  // CMS
  @Post('cms/leads')
  @AdaptiveThrottle({
    limit: 3,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  createCmsLead(@Body() body: any, @Query('orgId') orgId?: string) {
    return this.leadsService.createSubmission(body, orgId);
  }

  @Get('cms/leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getCmsLeads(@Query() query: any, @CurrentUser() user: JwtPayload) {
    return this.leadsService.getSubmissions(user.orgId, query);
  }

  // Helpdesk
  @Post('helpdesk/tickets')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  createTicket() {
    return { id: 'ticket_1' };
  }

  @Post('helpdesk/tickets/:id/messages')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  sendTicketMessage() {
    return { id: 'message_1' };
  }

  // AI
  @Post('ai/proposal')
  @AdaptiveThrottle({
    limit: 20,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  generateProposal() {
    return { id: 'proposal_1' };
  }

  // Analytics
  @Get('analytics/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getAnalytics() {
    return { revenue: 1000 };
  }

  // Automation
  @Post('automation/workflows')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('automation:write')
  @AdaptiveThrottle({
    limit: 10,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  createWorkflow() {
    return { id: 'workflow_1' };
  }

  @Post('automation/workflows/:id/trigger')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('automation:write')
  @AdaptiveThrottle({
    limit: 10,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
    burst: 2,
  })
  triggerWorkflow() {
    return { id: 'run_1' };
  }

  // Projects - Create project
  @Post('projects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('projects:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  createProject() {
    return { id: 'project_1' };
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('cms/services')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getCmsServices() {
    return [{ id: 'service_1', name: 'Web Dev' }];
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('cms/pages/:slug')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getCmsPage() {
    return { id: 'page_1', title: 'Home' };
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('helpdesk/faq')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getFaq() {
    return [{ id: 'faq_1', question: 'How?' }];
  }

  @Get('crm/leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getLeads(@Query() query: any, @CurrentUser() user: JwtPayload) {
    return this.leadsService.getLeads(user.orgId, query);
  }
}
