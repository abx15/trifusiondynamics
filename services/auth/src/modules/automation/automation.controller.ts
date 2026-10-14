import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AutomationService } from './automation.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { AdaptiveThrottle } from '../../common/decorators/adaptive-throttle.decorator';

@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('workflows')
  @RequirePermissions('automation:write')
  @AdaptiveThrottle({
    limit: 10,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createWorkflowDto: CreateWorkflowDto,
  ) {
    return this.automationService.create(user.orgId, createWorkflowDto);
  }

  @Get('workflows')
  @RequirePermissions('automation:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationService.findAll(
      user.orgId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('workflows/:id')
  @RequirePermissions('automation:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.automationService.findOne(user.orgId, id);
  }

  @Patch('workflows/:id')
  @RequirePermissions('automation:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.automationService.update(user.orgId, id, updateWorkflowDto);
  }

  @Patch('workflows/:id/toggle')
  @RequirePermissions('automation:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  toggleActive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.automationService.toggleActive(user.orgId, id);
  }

  @Post('workflows/:id/trigger')
  @RequirePermissions('automation:write')
  @AdaptiveThrottle({
    limit: 10,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
    burst: 2,
  })
  triggerManual(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.automationService.triggerManual(user.orgId, id);
  }

  @Get('workflows/:id/runs')
  @RequirePermissions('automation:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getRuns(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationService.getRuns(
      user.orgId,
      id,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
