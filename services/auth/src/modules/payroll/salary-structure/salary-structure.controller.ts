import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SalaryStructureService } from './salary-structure.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { PrismaService } from '../../database/prisma.service';

@Controller('payroll/salary-structure')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalaryStructureController {
  constructor(
    private readonly salaryStructureService: SalaryStructureService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermission('payroll:write')
  upsert(
    @Body() dto: CreateSalaryStructureDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.salaryStructureService.upsert(dto, orgId);
  }

  @Get(':employeeId')
  async findOne(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const hasPayrollRead = user.permissions.includes('payroll:read');

    // Check if self
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.organizationId !== user.orgId) {
      throw new ForbiddenException('Employee record not found');
    }

    const isSelf = user.sub === employee.userId;

    if (!isSelf && !hasPayrollRead) {
      throw new ForbiddenException(
        'You do not have access to this salary structure',
      );
    }

    return this.salaryStructureService.findOne(employeeId, user.orgId);
  }
}
export { type JwtPayload };
