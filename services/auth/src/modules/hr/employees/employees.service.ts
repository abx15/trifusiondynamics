import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeStatus, Prisma } from '@prisma/client';
import {
  parsePagination,
  paginatedResult,
} from '../../../common/utils/pagination';
import { DepartmentsService } from '../../helpdesk/departments/departments.service';

const MAX_EMPLOYEE_LIMIT = 200;

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private readonly departments: DepartmentsService,
  ) {}

  async create(dto: CreateEmployeeDto, orgId: string) {
    // 1. Verify user exists in the organization
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId: orgId },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${dto.userId} not found in this organization`,
      );
    }

    // 2. Verify user is not already linked to an employee
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { userId: dto.userId },
    });
    if (existingEmployee) {
      throw new BadRequestException(
        `User is already linked to employee ${existingEmployee.employeeCode}`,
      );
    }

    // 3. Generate sequential code: TFX-EMP-001, etc.
    const employeeCount = await this.prisma.employee.count({
      where: { organizationId: orgId },
    });
    const nextCodeNumber = employeeCount + 1;
    const employeeCode = `TFX-EMP-${String(nextCodeNumber).padStart(3, '0')}`;

    // 4. Resolve the department to a real org-scoped FK. `departmentId` is
    //    validated against the tenant; a legacy free-text `department` value is
    //    resolved (or created) within the tenant and preserved in
    //    `departmentLegacy` so no information is lost.
    const departmentId = dto.departmentId
      ? await this.departments.assertInOrg(this.prisma, dto.departmentId, orgId)
      : dto.department
        ? ((
            await this.departments.resolveOrCreateByName(
              this.prisma,
              orgId,
              dto.department,
            )
          )?.id ?? null)
        : null;

    // 5. Create Employee
    return this.prisma.employee.create({
      data: {
        userId: dto.userId,
        employeeCode,
        departmentId,
        departmentLegacy: dto.department ?? null,
        designation: dto.designation,
        joiningDate: new Date(dto.joiningDate),
        employmentType: dto.employmentType || 'FULL_TIME',
        status: EmployeeStatus.ACTIVE,
        organizationId: orgId,
      },
    });
  }

  /**
   * `department` accepts either a Department id or a free-text value so existing
   * callers keep working; both forms resolve to the same `departmentId` filter.
   */
  async findAll(
    orgId: string,
    department?: string,
    status?: EmployeeStatus,
    page?: number,
    limit?: number,
  ) {
    const where: Prisma.EmployeeWhereInput = { organizationId: orgId };
    if (department) {
      const trimmed = department.trim();
      const resolved =
        (await this.departments.resolveOrCreateByName(
          this.prisma,
          orgId,
          trimmed,
        )) ?? null;
      where.OR = [
        ...(resolved ? [{ departmentId: resolved.id }] : []),
        { departmentLegacy: { equals: trimmed, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const {
      skip,
      limit: take,
      page: p,
    } = parsePagination(
      page,
      Math.min(limit ?? MAX_EMPLOYEE_LIMIT, MAX_EMPLOYEE_LIMIT),
    );

    const [total, employees] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { employeeCode: 'asc' },
      }),
    ]);

    const employeeIds = employees.map((emp) => emp.id);

    const userIds = employees.map((emp) => emp.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const structures = await this.prisma.salaryStructure.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true, employeeId: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    const structureMap = new Map(structures.map((s) => [s.employeeId, s]));

    const data = employees.map((emp) => ({
      ...emp,
      user: userMap.get(emp.userId) || null,
      salaryStructure: structureMap.get(emp.id) || null,
    }));

    return paginatedResult(data, total, p, take);
  }

  async findOne(id: string, orgId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId: orgId },
      include: {
        leaves: true,
        documents: {
          select: {
            id: true,
            employeeId: true,
            type: true,
            uploadedAt: true,
          },
        },
      },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: employee.userId },
      select: { name: true, email: true },
    });
    return {
      ...employee,
      user,
    };
  }

  async findByUserId(userId: string, orgId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId: orgId },
      include: {
        leaves: true,
        documents: {
          select: {
            id: true,
            employeeId: true,
            type: true,
            uploadedAt: true,
          },
        },
      },
    });
    if (!employee) {
      throw new NotFoundException(
        `Employee record for User ID ${userId} not found`,
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: employee.userId },
      select: { name: true, email: true },
    });
    return {
      ...employee,
      user,
    };
  }

  async update(id: string, dto: UpdateEmployeeDto, orgId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const data: Prisma.EmployeeUpdateInput = {};
    if (dto.departmentId !== undefined) {
      // FK form: must exist inside the tenant, otherwise 404.
      const resolvedId = dto.departmentId
        ? await this.departments.assertInOrg(
            this.prisma,
            dto.departmentId,
            orgId,
          )
        : null;
      data.department = resolvedId
        ? { connect: { id: resolvedId } }
        : { disconnect: true };
      if (!resolvedId) data.departmentLegacy = null;
    } else if (dto.department !== undefined) {
      // Free-text form: resolve/create within the tenant and keep the original.
      const resolved = dto.department.trim()
        ? await this.departments.resolveOrCreateByName(
            this.prisma,
            orgId,
            dto.department,
          )
        : null;
      data.department = resolved
        ? { connect: { id: resolved.id } }
        : { disconnect: true };
      data.departmentLegacy = dto.department.trim() || null;
    }
    if (dto.designation !== undefined) data.designation = dto.designation;
    if (dto.employmentType !== undefined)
      data.employmentType = dto.employmentType;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.employee.update({
      where: { id },
      data,
    });
  }

  async findUsersToLink(orgId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId: orgId },
      select: { userId: true },
    });
    const linkedUserIds = employees.map((emp) => emp.userId);

    return this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        id: { notIn: linkedUserIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
