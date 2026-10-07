import {
  Body,
  Controller,
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
import { SlaPoliciesService } from './sla-policies.service';
import { CreateSlaPolicyDto, UpdateSlaPolicyDto } from './dto/sla-policy.dto';

@Controller('sla-policies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SlaPoliciesController {
  constructor(private readonly policies: SlaPoliciesService) {}

  @Get()
  @RequirePermission(TICKET_PERMISSIONS.READ)
  list(
    @Actor() actor: ActorContext,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.policies.list(actor, {
      includeInactive: includeInactive === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission(TICKET_PERMISSIONS.READ)
  findOne(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.policies.findById(id, actor);
  }

  @Post()
  @RequirePermission(TICKET_PERMISSIONS.MANAGE_SLA, TICKET_PERMISSIONS.WRITE)
  create(@Body() dto: CreateSlaPolicyDto, @Actor() actor: ActorContext) {
    return this.policies.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission(TICKET_PERMISSIONS.MANAGE_SLA, TICKET_PERMISSIONS.WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSlaPolicyDto,
    @Actor() actor: ActorContext,
  ) {
    return this.policies.update(id, dto, actor);
  }
}
