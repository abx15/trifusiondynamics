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
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { InvoicesService } from './invoices.service';
import { TasksService } from './tasks.service';
import { PayslipsService } from './payslips.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

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
  createLead(@Body() body: any) {
    return this.leadsService.createLead(body);
  }

  @Post('crm/leads/from-submission/:submissionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:write')
  promoteSubmissionToLead(@Param('submissionId') submissionId: string) {
    return this.leadsService.promoteSubmissionToLead(submissionId);
  }

  @Get('crm/contact-submissions')
  getContactSubmissions(@Query() query: any) {
    return this.leadsService.getSubmissions(query);
  }

  @Patch('crm/leads/:id/stage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:write')
  moveLeadStage(@Param('id') id: string, @Body() body: any) {
    return this.leadsService.moveStage(id, body.stage);
  }

  @Post('crm/leads/:id/convert')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:write')
  convertLead(@Param('id') id: string) {
    return this.leadsService.convertToClient(id);
  }

  // Billing
  @Post('billing/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('billing:write')
  createInvoice(@Body() body: any) {
    return this.invoicesService.createInvoice(body);
  }

  @Post('billing/invoices/:id/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('billing:write')
  recordPayment(@Param('id') id: string, @Body() body: any) {
    return this.invoicesService.recordPayment(id, body.amount);
  }

  // Projects
  @Post('projects/:id/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('projects:write')
  createTask(@Param('id') id: string, @Body() body: any) {
    return this.tasksService.createTask({ ...body, projectId: id });
  }

  @Patch('tasks/:id/move')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('projects:write')
  moveTask(@Param('id') id: string, @Body() body: any) {
    return this.tasksService.moveTask(id, body.status, body.order);
  }

  // Auth Stubs removed - use /api/auth routes from AuthController instead

  // CMS
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('cms/leads')
  createCmsLead(@Body() body: any) {
    return this.leadsService.createSubmission(body);
  }

  @Get('cms/leads')
  getCmsLeads(@Query() query: any) {
    return this.leadsService.getSubmissions(query);
  }

  // Helpdesk
  @Post('helpdesk/tickets')
  createTicket() {
    return { id: 'ticket_1' };
  }

  @Post('helpdesk/tickets/:id/messages')
  sendTicketMessage() {
    return { id: 'message_1' };
  }

  // AI
  @Post('ai/proposal')
  generateProposal() {
    return { id: 'proposal_1' };
  }

  // Analytics
  @Get('analytics/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getAnalytics() {
    return { revenue: 1000 };
  }

  // Automation
  @Post('automation/workflows')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('automation:write')
  createWorkflow() {
    return { id: 'workflow_1' };
  }

  @Post('automation/workflows/:id/trigger')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('automation:write')
  triggerWorkflow() {
    return { id: 'run_1' };
  }

  // Projects - Create project
  @Post('projects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('projects:write')
  createProject() {
    return { id: 'project_1' };
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('cms/services')
  getCmsServices() {
    return [{ id: 'service_1', name: 'Web Dev' }];
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('cms/pages/:slug')
  getCmsPage() {
    return { id: 'page_1', title: 'Home' };
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('helpdesk/faq')
  getFaq() {
    return [{ id: 'faq_1', question: 'How?' }];
  }

  @Get('crm/leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('crm:read')
  getLeads() {
    return this.leadsService.getLeads();
  }
}
