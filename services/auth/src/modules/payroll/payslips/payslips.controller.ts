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
  NotFoundException,
} from '@nestjs/common';
import { PayslipsService } from './payslips.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { PrismaService } from '../../database/prisma.service';

@Controller('payroll/payslips')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayslipsController {
  constructor(
    private readonly payslipsService: PayslipsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('generate-bulk')
  @RequirePermission('payroll:write')
  generateBulk(
    @Body('month') month: number,
    @Body('year') year: number,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.payslipsService.generateBulk(
      orgId,
      Number(month),
      Number(year),
    );
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const hasPayrollRead = user.permissions.includes('payroll:read');
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    if (hasPayrollRead) {
      return this.payslipsService.findAll(
        user.orgId,
        employeeId,
        pageNum,
        limitNum,
      );
    }

    // Restrict only to self
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.sub },
    });
    if (!employee) {
      throw new NotFoundException('Employee record not found for this user');
    }

    return this.payslipsService.findAll(
      user.orgId,
      employee.id,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const payslip = await this.payslipsService.findOne(id, user.orgId);
    const hasPayrollRead = user.permissions.includes('payroll:read');

    if (!hasPayrollRead) {
      // Check ownership
      const employee = await this.prisma.employee.findUnique({
        where: { userId: user.sub },
      });
      if (!employee || employee.id !== payslip.employeeId) {
        throw new ForbiddenException('You do not have access to this payslip');
      }
    }

    return payslip;
  }

  @Patch(':id/pay')
  @RequirePermission('payroll:write')
  markAsPaid(@Param('id') id: string, @CurrentUser('orgId') orgId: string) {
    return this.payslipsService.markAsPaid(id, orgId);
  }
}
export { type JwtPayload };
