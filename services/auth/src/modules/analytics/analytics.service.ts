import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly db: PrismaService) {}

  async getDashboardOverview(
    organizationId: string,
    from?: string,
    to?: string,
  ) {
    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const revenue = await this.db.revenueRollup.findMany({
      where: {
        organizationId,
        periodType: 'daily',
        periodDate: { gte: fromDate, lte: toDate },
      },
      orderBy: { periodDate: 'asc' },
    });

    const clients = await this.db.clientRollup.findMany({
      where: {
        organizationId,
        periodDate: { gte: fromDate, lte: toDate },
      },
      orderBy: { periodDate: 'asc' },
    });

    const teamPerformance = await this.db.teamPerformanceRollup.findMany({
      where: {
        organizationId,
        periodDate: {
          gte: new Date(fromDate.getFullYear(), fromDate.getMonth(), 1),
        },
      },
      orderBy: { tasksCompleted: 'desc' },
      take: 5,
    });

    return {
      revenueTrend: revenue,
      clientGrowth: clients,
      topPerformers: teamPerformance,
    };
  }

  async getRevenueTrend(organizationId: string) {
    return this.db.revenueRollup.findMany({
      where: { organizationId, periodType: 'daily' },
      orderBy: { periodDate: 'desc' },
      take: 30,
    });
  }

  async getClientGrowth(organizationId: string) {
    return this.db.clientRollup.findMany({
      where: { organizationId },
      orderBy: { periodDate: 'desc' },
      take: 30,
    });
  }

  async getTeamPerformance(
    organizationId: string,
    month?: number,
    year?: number,
  ) {
    const m = month !== undefined ? month : new Date().getMonth() + 1;
    const y = year !== undefined ? year : new Date().getFullYear();
    const date = new Date(y, m - 1, 1);

    return this.db.teamPerformanceRollup.findMany({
      where: {
        organizationId,
        periodDate: date,
      },
      orderBy: { tasksCompleted: 'desc' },
    });
  }

  async runRollupJobNow(date: string) {
    this.logger.log(`Manual rollup triggered for date: ${date}`);
    // In a real scenario, this would compute from invoices, expenses, etc.
    // For demo purposes, we just return success since mock data is seeded.
    return { status: 'success', message: `Rollup executed for ${date}` };
  }
}
