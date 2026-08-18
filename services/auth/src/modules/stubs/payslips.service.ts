import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PayslipsService {
  constructor(private readonly db: PrismaService) {}

  async generatePayslip(data: any) {
    // verify tax slab logic: gross under 25000 = 0% tax, above = 5% tax
    const gross = data.grossSalary || 0;
    let tax = 0;

    if (gross > 25000) {
      tax = gross * 0.05;
    }

    const net = gross - tax;

    return this.db.payslip.create({
      data: {
        ...data,
        taxAmount: tax,
        netSalary: net,
      },
    });
  }
}
