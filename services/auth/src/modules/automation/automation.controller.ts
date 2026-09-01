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

@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('workflows')
  @RequirePermissions('automation:write')
  create(@Req() req, @Body() createWorkflowDto: CreateWorkflowDto) {
    return this.automationService.create(
      req.user.organizationId,
      createWorkflowDto,
    );
  }

  @Get('workflows')
  @RequirePermissions('automation:read')
  findAll(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationService.findAll(
      req.user.organizationId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('workflows/:id')
  @RequirePermissions('automation:read')
  findOne(@Req() req, @Param('id') id: string) {
    return this.automationService.findOne(req.user.organizationId, id);
  }

  @Patch('workflows/:id')
  @RequirePermissions('automation:write')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.automationService.update(
      req.user.organizationId,
      id,
      updateWorkflowDto,
    );
  }

  @Patch('workflows/:id/toggle')
  @RequirePermissions('automation:write')
  toggleActive(@Req() req, @Param('id') id: string) {
    return this.automationService.toggleActive(req.user.organizationId, id);
  }

  @Post('workflows/:id/trigger')
  @RequirePermissions('automation:write')
  triggerManual(@Req() req, @Param('id') id: string) {
    return this.automationService.triggerManual(req.user.organizationId, id);
  }

  @Get('workflows/:id/runs')
  @RequirePermissions('automation:read')
  getRuns(
    @Req() req,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationService.getRuns(
      req.user.organizationId,
      id,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
