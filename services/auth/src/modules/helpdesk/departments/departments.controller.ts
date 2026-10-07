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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @RequirePermission(TICKET_PERMISSIONS.READ)
  list(
    @Actor() actor: ActorContext,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.departments.list(actor, {
      includeInactive: includeInactive === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  // Managing the department structure is an administrative action; reading
  // departments is only a helpdesk read.
  @RequirePermission(
    TICKET_PERMISSIONS.MANAGE_ROUTING,
    TICKET_PERMISSIONS.WRITE,
  )
  create(@Body() dto: CreateDepartmentDto, @Actor() actor: ActorContext) {
    return this.departments.create(dto, actor);
  }

  @Get(':id')
  @RequirePermission(TICKET_PERMISSIONS.READ)
  findOne(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.departments.findById(id, actor);
  }

  @Patch(':id')
  @RequirePermission(
    TICKET_PERMISSIONS.MANAGE_ROUTING,
    TICKET_PERMISSIONS.WRITE,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Actor() actor: ActorContext,
  ) {
    return this.departments.update(id, dto, actor);
  }
}
