import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeStatus } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

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

    // 4. Create Employee
    return this.prisma.employee.create({
      data: {
        userId: dto.userId,
        employeeCode,
        department: dto.department,
        designation: dto.designation,
        joiningDate: new Date(dto.joiningDate),
        employmentType: dto.employmentType || 'FULL_TIME',
        status: EmployeeStatus.ACTIVE,
        organizationId: orgId,
      },
    });
  }

  async findAll(orgId: string, department?: string, status?: EmployeeStatus) {
    const where: any = { organizationId: orgId };
    if (department) {
      where.department = department;
    }
    if (status) {
      where.status = status;
    }

    const employees = await this.prisma.employee.findMany({
      where,
      orderBy: { employeeCode: 'asc' },
    });

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

    return employees.map((emp) => ({
      ...emp,
      user: userMap.get(emp.userId) || null,
      salaryStructure: structureMap.get(emp.id) || null,
    }));
  }

  async findOne(id: string, orgId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId: orgId },
      include: {
        leaves: true,
        documents: true,
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
        documents: true,
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

    const data: any = {};
    if (dto.department !== undefined) data.department = dto.department;
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
