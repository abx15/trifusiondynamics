import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PayslipStatus } from '@prisma/client';
import { parsePagination } from '../../../common/utils/pagination';

const PAYSLIPS_MAX_LIMIT = 200;

@Injectable()
export class PayslipsService {
  constructor(private prisma: PrismaService) {}

  async generateBulk(orgId: string, month: number, year: number) {
    if (!month || month < 1 || month > 12) {
      throw new BadRequestException('Invalid month. Must be between 1 and 12.');
    }
    if (!year || year < 2000 || year > 2100) {
      throw new BadRequestException('Invalid year.');
    }

    const employees = await this.prisma.employee.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
    });

    let generated = 0;
    let skipped = 0;

    for (const emp of employees) {
      await this.prisma.$transaction(async (tx) => {
        // Find salary structure
        const structure = await tx.salaryStructure.findUnique({
          where: { employeeId: emp.id },
        });

        if (!structure) {
          skipped++;
          return;
        }

        // Check if payslip already exists for this month/year
        const existing = await tx.payslip.findUnique({
          where: {
            employeeId_month_year: {
              employeeId: emp.id,
              month,
              year,
            },
          },
        });

        if (existing) {
          skipped++;
          return;
        }

        // Compute values
        const basic = Number(structure.basicSalary);
        const hra = Number(structure.hra);
        const allowances = Number(structure.allowances);
        const deductions = Number(structure.deductions);

        const gross = basic + hra + allowances;
        const tax = gross > 25000 ? gross * 0.05 : 0;
        const net = gross - deductions - tax;

        await tx.payslip.create({
          data: {
            employeeId: emp.id,
            month,
            year,
            grossAmount: gross,
            deductions: deductions,
            tax,
            netAmount: net,
            status: PayslipStatus.GENERATED,
          },
        });

        generated++;
      });
    }

    return { generated, skipped };
  }

  async findAll(
    orgId: string,
    employeeId?: string,
    page?: number,
    limit?: number,
  ) {
    // Bounded employee fetch: organizations with an extreme number of employees
    // would otherwise materialise the full employee list in memory.  The payslip
    // query itself is paginated via `take` below; this cap simply prevents the
    // employee ID list from growing unboundedly.
    const employees = await this.prisma.employee.findMany({
      where: { organizationId: orgId },
      take: 1000,
    });
    const employeeIds = employees.map((emp) => emp.id);

    if (employeeId && !employeeIds.includes(employeeId)) {
      return [];
    }

    const { skip, take } = parsePagination(
      page,
      Math.min(limit ?? PAYSLIPS_MAX_LIMIT, PAYSLIPS_MAX_LIMIT),
    );

    const where: any = {
      employeeId: employeeId ? employeeId : { in: employeeIds },
    };

    const payslips = await this.prisma.payslip.findMany({
      where,
      skip,
      take,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const userIds = employees.map((emp) => emp.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const employeeMap = new Map(
      employees.map((emp) => [
        emp.id,
        {
          ...emp,
          user: userMap.get(emp.userId) || null,
        },
      ]),
    );

    return payslips.map((p) => ({
      ...p,
      employee: employeeMap.get(p.employeeId) || null,
    }));
  }

  async findOne(id: string, orgId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id },
    });
    if (!payslip) {
      throw new NotFoundException(`Payslip with ID ${id} not found`);
    }

    // Verify employee belongs to org
    const employee = await this.prisma.employee.findFirst({
      where: { id: payslip.employeeId, organizationId: orgId },
    });
    if (!employee) {
      throw new NotFoundException(`Payslip with ID ${id} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: employee.userId },
      select: { name: true, email: true },
    });

    return {
      ...payslip,
      employee: {
        ...employee,
        user,
      },
    };
  }

  async markAsPaid(id: string, orgId: string) {
    const payslip = await this.findOne(id, orgId);

    if (payslip.status === PayslipStatus.PAID) {
      throw new BadRequestException('Payslip is already paid');
    }

    return this.prisma.payslip.update({
      where: { id },
      data: {
        status: PayslipStatus.PAID,
        paidAt: new Date(),
      },
    });
  }
}
