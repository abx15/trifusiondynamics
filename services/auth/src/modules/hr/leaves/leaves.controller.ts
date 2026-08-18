import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { PrismaService } from '../../database/prisma.service';

@Controller('hr/leaves')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeavesController {
  constructor(
    private readonly leavesService: LeavesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@Body() dto: CreateLeaveDto, @CurrentUser() user: JwtPayload) {
    return this.leavesService.create(dto, user.sub, user.orgId);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('employeeId') employeeId?: string,
  ) {
    const hasHrRead = user.permissions.includes('hr:read');

    if (hasHrRead) {
      return this.leavesService.findAll(user.orgId, employeeId);
    }

    // If not HR manager, restrict only to self
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.sub },
    });
    if (!employee) {
      throw new NotFoundException('Employee record not found');
    }

    return this.leavesService.findAll(user.orgId, undefined, employee.id);
  }

  @Patch(':id/review')
  @RequirePermission('hr:write')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leavesService.review(id, dto, user.sub, user.orgId);
  }
}
export { type JwtPayload };
