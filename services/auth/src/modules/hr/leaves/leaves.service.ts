import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { LeaveStatus, EmployeeStatus } from '@prisma/client';
import { parsePagination } from '../../../common/utils/pagination';

const LEAVES_MAX_LIMIT = 200;

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLeaveDto, userId: string, orgId: string) {
    // Find employee linked to the current user
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee || employee.organizationId !== orgId) {
      throw new NotFoundException(
        'Employee record not found for your user account',
      );
    }

    if (new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new BadRequestException(
        'Start date must be before or equal to end date',
      );
    }

    return this.prisma.leave.create({
      data: {
        employeeId: employee.id,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
        status: LeaveStatus.PENDING,
      },
    });
  }

  async findAll(
    orgId: string,
    employeeId?: string,
    selfEmployeeId?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {
      employee: {
        organizationId: orgId,
      },
    };

    if (selfEmployeeId) {
      where.employeeId = selfEmployeeId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    const { skip, limit: take } = parsePagination(
      page,
      Math.min(limit ?? LEAVES_MAX_LIMIT, LEAVES_MAX_LIMIT),
    );

    return this.prisma.leave.findMany({
      where,
      skip,
      take,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(
    id: string,
    dto: ReviewLeaveDto,
    reviewerUserId: string,
    orgId: string,
  ) {
    const leave = await this.prisma.leave.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!leave || leave.employee.organizationId !== orgId) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    // Find reviewer's Employee record
    const reviewerEmp = await this.prisma.employee.findUnique({
      where: { userId: reviewerUserId },
    });
    if (!reviewerEmp) {
      throw new NotFoundException('Reviewer employee record not found');
    }

    // Atomic: leave status + employee status must be consistent.
    // We re-check the leave + employee inside the transaction to avoid a TOCTOU race.
    const { updatedLeave, employeeUpdated } = await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.leave.findUnique({
          where: { id },
          include: { employee: true },
        });
        if (!current || current.employee.organizationId !== orgId) {
          throw new NotFoundException(`Leave request with ID ${id} not found`);
        }

        const updated = await tx.leave.update({
          where: { id },
          data: {
            status: dto.status,
            approvedById: reviewerEmp.id,
          },
        });

        let employeeTouched = false;
        if (
          dto.status === LeaveStatus.APPROVED &&
          current.employee.status === EmployeeStatus.ACTIVE
        ) {
          await tx.employee.update({
            where: { id: leave.employeeId },
            data: { status: EmployeeStatus.ON_LEAVE },
          });
          employeeTouched = true;
        }

        return { updatedLeave: updated, employeeUpdated: employeeTouched };
      },
    );

    return updatedLeave;
  }
}
