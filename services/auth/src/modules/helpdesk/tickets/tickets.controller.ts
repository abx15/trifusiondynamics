import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Actor } from '../../../common/auth/actor.decorator';
import type { ActorContext } from '../../../common/auth/actor.decorator';
import { TICKET_PERMISSIONS } from '../../../common/auth/ticket-permissions';
import { TicketsService } from './tickets.service';
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

/**
 * Ticket endpoints.
 *
 * There is deliberately no generic "set status" endpoint. Every
 * lifecycle change is a named business action whose transition is
 * validated server-side by the state machine in
 * `ticket-state-machine.ts`, so an invalid move is a 409 and an
 * unauthorized move is a 403 — never a silent write.
 *
 * `@RequirePermission` is only the coarse action gate; object-level
 * authorization (tenant, client ownership, assignment) is enforced
 * inside TicketsService / TicketAuthorizationService on every call.
 */
@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @RequirePermission(TICKET_PERMISSIONS.WRITE)
  create(@Body() dto: CreateTicketDto, @Actor() actor: ActorContext) {
    return this.tickets.create(dto, actor);
  }

  @Get('summary')
  @RequirePermission(TICKET_PERMISSIONS.READ)
  summary(@Actor() actor: ActorContext) {
    return this.tickets.summary(actor);
  }

  @Get()
  @RequirePermission(TICKET_PERMISSIONS.READ)
  list(@Query() query: TicketQueryDto, @Actor() actor: ActorContext) {
    return this.tickets.list(query, actor);
  }


  @Get(':id')
  @RequirePermission(TICKET_PERMISSIONS.READ)
  findOne(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.tickets.findOne(actor, id);
  }

  @Get(':id/activities')
  @RequirePermission(TICKET_PERMISSIONS.READ)
  activities(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tickets.listActivities(
      actor,
      id,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /** Staff triage update (title, description, category, priority, scope). */
  @Patch(':id')
  @RequirePermission(TICKET_PERMISSIONS.WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.update(actor, id, dto);
  }

  @Post(':id/assign')
  @RequirePermission(TICKET_PERMISSIONS.ASSIGN)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.assign(actor, id, dto);
  }

  @Post(':id/unassign')
  @RequirePermission(TICKET_PERMISSIONS.ASSIGN)
  unassign(
    @Param('id') id: string,
    @Body() dto: UnassignTicketDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.unassign(actor, id, dto);
  }

  @Post(':id/start-work')
  @RequirePermission(TICKET_PERMISSIONS.WRITE)
  startWork(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.tickets.startWork(actor, id);
  }

  @Post(':id/submit-resolution')
  @RequirePermission(TICKET_PERMISSIONS.SUBMIT_RESOLUTION)
  submitResolution(
    @Param('id') id: string,
    @Body() dto: SubmitResolutionDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.submitResolution(actor, id, dto);
  }

  @Post(':id/verify-resolution')
  @RequirePermission(TICKET_PERMISSIONS.VERIFY_RESOLUTION)
  verifyResolution(
    @Param('id') id: string,
    @Body() dto: VerifyResolutionDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.verifyResolution(actor, id, dto);
  }

  /** Requester accepts the resolution, permitting closure. */
  @Post(':id/confirm')
  @RequirePermission(TICKET_PERMISSIONS.WRITE)
  clientConfirm(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.tickets.clientConfirm(actor, id);
  }

  @Post(':id/reopen')
  @RequirePermission(TICKET_PERMISSIONS.REOPEN)
  reopen(
    @Param('id') id: string,
    @Body() dto: ReopenTicketDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.reopen(actor, id, dto);
  }

  @Post(':id/close')
  @RequirePermission(TICKET_PERMISSIONS.CLOSE)
  close(
    @Param('id') id: string,
    @Body() dto: CloseTicketDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.close(actor, id, dto);
  }

  /**
   * Staff override for closing a client ticket that the client has
   * not confirmed. Requires the dedicated permission, a mandatory
   * justification, and is fully audited.
   */
  @Post(':id/close-override')
  @RequirePermission(TICKET_PERMISSIONS.CLOSE_OVERRIDE)
  closeWithOverride(
    @Param('id') id: string,
    @Body() dto: CloseOverrideDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.closeWithOverride(actor, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermission(TICKET_PERMISSIONS.WRITE)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelTicketDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.cancel(actor, id, dto);
  }

  @Post(':id/escalate')
  @RequirePermission(TICKET_PERMISSIONS.ESCALATE)
  escalate(
    @Param('id') id: string,
    @Body() dto: EscalateTicketDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.escalate(actor, id, dto);
  }

  @Patch(':id/escalation')
  @RequirePermission(TICKET_PERMISSIONS.ESCALATE)
  clearEscalation(
    @Param('id') id: string,
    @Body() dto: ClearEscalationDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.clearEscalation(actor, id, dto);
  }

  /** Public comment, or internal note when `isInternal: true`. */
  @Post(':id/comments')
  @RequirePermission(TICKET_PERMISSIONS.WRITE)
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.addComment(actor, id, dto);
  }

  /** List comments for a ticket. Internal notes are hidden from non-staff. */
  @Get(':id/comments')
  @RequirePermission(TICKET_PERMISSIONS.READ)
  listComments(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tickets.listComments(
      actor,
      id,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /**
   * Registers an attachment whose bytes were uploaded directly
   * to object storage; the API never proxies file bytes.
   */
  @Post(':id/attachments')
  @RequirePermission(TICKET_PERMISSIONS.WRITE)
  addAttachment(
    @Param('id') id: string,
    @Body() dto: AddAttachmentDto,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.addAttachment(actor, id, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @RequirePermission(TICKET_PERMISSIONS.WRITE)
  removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Actor() actor: ActorContext,
  ) {
    return this.tickets.removeAttachment(actor, id, attachmentId);
  }
}
