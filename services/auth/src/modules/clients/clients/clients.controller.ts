import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { AdaptiveThrottle } from '../../../common/decorators/adaptive-throttle.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermission('clients:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: JwtPayload) {
    return this.clientsService.create(dto, user.orgId);
  }

  @Get()
  @RequirePermission('clients:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientsService.findAll(user.orgId, {
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('clients:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clientsService.findOne(id, user.orgId);
  }

  @Patch(':id')
  @RequirePermission('clients:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.update(id, user.orgId, dto);
  }

  @Delete(':id')
  @RequirePermission('clients:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clientsService.remove(id, user.orgId);
  }

  @Post('from-lead/:leadId')
  @RequirePermission('clients:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  createFromLead(
    @Param('leadId') leadId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.createFromLead(leadId, user.orgId);
  }
}
