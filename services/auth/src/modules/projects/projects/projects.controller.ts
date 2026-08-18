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
  ForbiddenException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { ProjectStatus } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermission('projects:write')
  create(@Body() dto: CreateProjectDto, @CurrentUser('orgId') orgId: string) {
    return this.projectsService.create(dto, orgId);
  }

  @Get()
  @RequirePermission('projects:read')
  findAll(
    @CurrentUser('orgId') orgId: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: ProjectStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.projectsService.findAll(orgId, clientId, status, p, l);
  }

  @Get(':id')
  @RequirePermission('projects:read')
  findOne(@Param('id') id: string, @CurrentUser('orgId') orgId: string) {
    return this.projectsService.findOne(id, orgId);
  }

  @Patch(':id')
  @RequirePermission('projects:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.projectsService.update(id, dto, orgId);
  }

  @Delete(':id')
  @RequirePermission('projects:write')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    if (!user.roles.includes('admin')) {
      throw new ForbiddenException('Admin only action');
    }
    return this.projectsService.remove(id, user.orgId);
  }

  @Post(':id/members')
  @RequirePermission('projects:write')
  addMember(
    @Param('id') projectId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.projectsService.addMember(projectId, dto, orgId);
  }

  @Delete(':id/members/:userId')
  @RequirePermission('projects:write')
  removeMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.projectsService.removeMember(projectId, userId, orgId);
  }
}
