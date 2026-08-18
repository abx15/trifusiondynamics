import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { EmployeeStatus } from '@prisma/client';

@Controller('hr/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermission('hr:write')
  create(@Body() dto: CreateEmployeeDto, @CurrentUser('orgId') orgId: string) {
    return this.employeesService.create(dto, orgId);
  }

  @Get()
  @RequirePermission('hr:read')
  findAll(
    @CurrentUser('orgId') orgId: string,
    @Query('department') department?: string,
    @Query('status') status?: EmployeeStatus,
  ) {
    return this.employeesService.findAll(orgId, department, status);
  }

  @Get('me')
  async findMe(@CurrentUser() user: JwtPayload) {
    return this.employeesService.findByUserId(user.sub, user.orgId);
  }

  @Get('users')
  @RequirePermission('hr:write')
  async findUsersToLink(@CurrentUser('orgId') orgId: string) {
    return this.employeesService.findUsersToLink(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const employee = await this.employeesService.findOne(id, user.orgId);

    // Check ownership: must be the employee themselves OR have 'hr:read' permission
    const isSelf = user.sub === employee.userId;
    const hasHrRead = user.permissions.includes('hr:read');

    if (!isSelf && !hasHrRead) {
      throw new ForbiddenException(
        'You do not have access to this employee profile',
      );
    }

    return employee;
  }

  @Patch(':id')
  @RequirePermission('hr:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.employeesService.update(id, dto, orgId);
  }
}
export { type JwtPayload };
