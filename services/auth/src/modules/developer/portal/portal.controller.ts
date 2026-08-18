import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ClientScopeGuard } from '../../../gateway/guards/client-scope.guard';

/**
 * Stub controller demonstrating the client portal scoping.
 * In a real environment, this would inject ProjectsService, InvoicesService, etc.
 * and filter by req.user.linkedClientId.
 */
@Controller('portal')
@UseGuards(JwtAuthGuard, ClientScopeGuard)
export class PortalController {
  private readonly logger = new Logger(PortalController.name);

  @Get('projects')
  getProjects(@Req() req) {
    this.logger.debug(
      `Fetching projects for client: ${req.user.linkedClientId}`,
    );
    return [
      {
        id: 'proj-1',
        name: 'Website Redesign',
        status: 'IN_PROGRESS',
        clientId: req.user.linkedClientId,
      },
      {
        id: 'proj-2',
        name: 'SEO Campaign',
        status: 'COMPLETED',
        clientId: req.user.linkedClientId,
      },
    ];
  }

  @Get('projects/:id')
  getProjectDetails(@Req() req, @Param('id') id: string) {
    return {
      id,
      name: 'Website Redesign',
      status: 'IN_PROGRESS',
      clientId: req.user.linkedClientId,
      description: 'Stub details',
    };
  }

  @Get('invoices')
  getInvoices(@Req() req) {
    return [
      {
        id: 'inv-1',
        amount: 5000,
        status: 'PAID',
        clientId: req.user.linkedClientId,
      },
      {
        id: 'inv-2',
        amount: 2500,
        status: 'PENDING',
        clientId: req.user.linkedClientId,
      },
    ];
  }

  @Get('invoices/:id/pdf')
  getInvoicePdf(@Req() req, @Param('id') id: string) {
    return {
      message: 'PDF generated successfully',
      url: 'https://fake-s3.url/invoice.pdf',
    };
  }

  @Get('documents')
  getDocuments(@Req() req) {
    return [
      { id: 'doc-1', name: 'Contract.pdf', clientId: req.user.linkedClientId },
    ];
  }

  @Get('tickets')
  getTickets(@Req() req) {
    return [
      {
        id: 'ticket-1',
        subject: 'Server Down',
        status: 'OPEN',
        clientId: req.user.linkedClientId,
      },
    ];
  }

  @Post('tickets')
  createTicket(@Req() req) {
    return {
      message: 'Ticket created successfully',
      clientId: req.user.linkedClientId,
    };
  }

  @Get('tickets/:id/messages')
  getTicketMessages(@Req() req, @Param('id') id: string) {
    return [
      { id: 'msg-1', sender: 'Support', text: 'We are looking into it.' },
    ];
  }
}
