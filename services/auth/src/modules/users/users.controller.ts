import { Controller, Post, Get, Patch, Delete, Body, UseGuards, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { type JwtPayload } from '@agency-os/types';

function isSuperAdminUser(user: JwtPayload): boolean {
  const roles = user?.roles || [];
  return roles.some((r) => ['superadmin', 'super_admin'].includes(r.toLowerCase()));
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:write')
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.createUserByAdmin(dto, user.orgId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:read')
  async listUsers(@CurrentUser() user: JwtPayload) {
    const isSuper = isSuperAdminUser(user);
    return this.usersService.listUsers(user.orgId, isSuper);
  }

  @Get('organizations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:read')
  async listOrganizations() {
    return this.usersService.listOrganizations();
  }

  @Post('organizations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:write')
  async createOrganization(@Body() body: { name: string; slug: string }) {
    return this.usersService.createOrganization(body);
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:read')
  async listRoles() {
    return this.usersService.listRoles();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:write')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const isSuper = isSuperAdminUser(user);
    return this.usersService.updateUser(id, user.orgId, dto, isSuper);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:write')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const isSuper = isSuperAdminUser(user);
    return this.usersService.deleteUser(id, user.orgId, isSuper);
  }
}

