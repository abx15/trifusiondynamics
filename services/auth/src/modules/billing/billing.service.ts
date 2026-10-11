import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  paidInvoices: number;
  overdueInvoices: number;
  outstandingAmount: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinanceSummary(
    organizationId: string,
    year: number,
  ): Promise<FinanceSummary> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get all invoices for the organization in the specified year
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payments: true,
      },
    });

    // Calculate metrics
    const paidInvoices = invoices.filter((inv) => inv.status === 'PAID').length;
    const overdueInvoices = invoices.filter(
      (inv) => inv.status !== 'PAID' && new Date(inv.dueDate) < new Date(),
    ).length;

    const totalRevenue = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    const outstandingAmount = invoices
      .filter((inv) => inv.status !== 'PAID')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    // For expenses, we'll use a placeholder for now as there's no expense table
    // This should be replaced with actual expense logic when implemented
    const totalExpenses = 0;
    const netProfit = totalRevenue - totalExpenses;

    // Generate monthly data
    const monthlyData: FinanceSummary['monthlyData'] = [];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      const monthInvoices = invoices.filter(
        (inv) => inv.issueDate >= monthStart && inv.issueDate <= monthEnd,
      );

      const monthRevenue = monthInvoices
        .filter((inv) => inv.status === 'PAID')
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

      monthlyData.push({
        month: months[month],
        revenue: monthRevenue,
        expenses: 0, // Replace with actual expense calculation
        profit: monthRevenue,
      });
    }

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      paidInvoices,
      overdueInvoices,
      outstandingAmount,
      monthlyData,
    };
  }
}
