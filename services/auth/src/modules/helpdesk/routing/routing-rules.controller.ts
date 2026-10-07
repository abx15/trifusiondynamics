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
import { RoutingRulesService } from './routing-rules.service';
import {
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
} from './dto/routing-rule.dto';

@Controller('routing-rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoutingRulesController {
  constructor(private readonly rules: RoutingRulesService) {}

  @Get()
  @RequirePermission(TICKET_PERMISSIONS.READ)
  list(
    @Actor() actor: ActorContext,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rules.list(actor, {
      includeInactive: includeInactive === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission(TICKET_PERMISSIONS.READ)
  findOne(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.rules.findById(id, actor);
  }

  @Post()
  @RequirePermission(
    TICKET_PERMISSIONS.MANAGE_ROUTING,
    TICKET_PERMISSIONS.WRITE,
  )
  create(@Body() dto: CreateRoutingRuleDto, @Actor() actor: ActorContext) {
    return this.rules.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission(
    TICKET_PERMISSIONS.MANAGE_ROUTING,
    TICKET_PERMISSIONS.WRITE,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoutingRuleDto,
    @Actor() actor: ActorContext,
  ) {
    return this.rules.update(id, dto, actor);
  }
}
