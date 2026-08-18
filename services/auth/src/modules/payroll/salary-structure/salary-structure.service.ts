import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';

@Injectable()
export class SalaryStructureService {
  constructor(private prisma: PrismaService) {}

  async upsert(dto: CreateSalaryStructureDto, orgId: string) {
    // 1. Verify Employee exists in organization
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId: orgId },
    });
    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${dto.employeeId} not found`,
      );
    }

    // 2. Upsert Salary Structure
    return this.prisma.salaryStructure.upsert({
      where: { employeeId: dto.employeeId },
      update: {
        basicSalary: dto.basicSalary,
        hra: dto.hra || 0,
        allowances: dto.allowances || 0,
        deductions: dto.deductions || 0,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
      },
      create: {
        employeeId: dto.employeeId,
        basicSalary: dto.basicSalary,
        hra: dto.hra || 0,
        allowances: dto.allowances || 0,
        deductions: dto.deductions || 0,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
      },
    });
  }

  async findOne(employeeId: string, orgId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const structure = await this.prisma.salaryStructure.findUnique({
      where: { employeeId },
    });
    if (!structure) {
      throw new NotFoundException(
        `Salary structure for Employee ${employeeId} not configured`,
      );
    }

    return structure;
  }
}
