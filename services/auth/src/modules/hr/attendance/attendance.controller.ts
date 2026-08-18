import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PunchDto } from './dto/punch.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { PrismaService } from '../../database/prisma.service';

@Controller('hr/attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly prisma: PrismaService,
  ) {}

  private async getEmployeeByUserId(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) {
      throw new NotFoundException(
        'Employee record not found for this user account',
      );
    }
    return employee;
  }

  @Post('check-in')
  async checkIn(
    @Body() dto: PunchDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const employee = await this.getEmployeeByUserId(user.sub);
    return this.attendanceService.checkIn(employee.id, user.orgId, dto);
  }

  @Post('check-out')
  async checkOut(
    @Body() dto: PunchDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const employee = await this.getEmployeeByUserId(user.sub);
    return this.attendanceService.checkOut(employee.id, user.orgId, dto);
  }

  @Get('me/today')
  async getTodayStatus(@CurrentUser() user: JwtPayload): Promise<any> {
    const employee = await this.getEmployeeByUserId(user.sub);
    return this.attendanceService.getTodayStatus(employee.id);
  }

  @Get(':employeeId/summary')
  async getSummary(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<any> {
    // Check if self or has hr:read
    const targetEmployee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!targetEmployee || targetEmployee.organizationId !== user.orgId) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const isSelf = user.sub === targetEmployee.userId;
    const hasHrRead = user.permissions.includes('hr:read');

    if (!isSelf && !hasHrRead) {
      throw new ForbiddenException(
        'You do not have access to this attendance summary',
      );
    }

    const today = new Date();
    const m = month ? parseInt(month, 10) : today.getMonth() + 1;
    const y = year ? parseInt(year, 10) : today.getFullYear();

    return this.attendanceService.getMonthlySummary(employeeId, m, y);
  }
}
export { type JwtPayload };
