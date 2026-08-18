import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { type JwtPayload } from '@agency-os/types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:write') // Only users with hr:write can create users
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.createUserByAdmin(dto, user.orgId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr:read') // Only users with hr:read can list users
  async listUsers(@CurrentUser() user: JwtPayload) {
    return this.usersService.listUsers(user.orgId);
  }
}
