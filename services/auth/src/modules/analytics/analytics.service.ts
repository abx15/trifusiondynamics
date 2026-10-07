import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const ANALYTICS_MAX_LIMIT = 365;

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
      take: ANALYTICS_MAX_LIMIT,
    });

    const clients = await this.db.clientRollup.findMany({
      where: {
        organizationId,
        periodDate: { gte: fromDate, lte: toDate },
      },
      orderBy: { periodDate: 'asc' },
      take: ANALYTICS_MAX_LIMIT,
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

  /**
   * Executes rollup for a specific date. Idempotent: uses upsert so
   * re-running for the same date overwrites existing data.
   */
  async runRollupJobNow(date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate() + 1,
    );

    this.logger.log(`Starting rollup for date: ${startOfDay.toISOString()}`);

    // Get all organizations to roll up
    const organizations = await this.db.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let processedCount = 0;

    for (const org of organizations) {
      try {
        await this.rollupRevenue(org.id, startOfDay);
        await this.rollupClients(org.id, startOfDay);
        await this.rollupTeamPerformance(org.id, startOfDay);
        processedCount++;
      } catch (error) {
        this.logger.error(
          `Rollup failed for organization ${org.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `Rollup completed: ${processedCount}/${organizations.length} organizations processed`,
    );

    return {
      status: 'success',
      message: `Rollup executed for ${date}`,
      processed: processedCount,
      total: organizations.length,
    };
  }

  /**
   * Roll up revenue data from invoices and expenses.
   */
  private async rollupRevenue(organizationId: string, date: Date) {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Sum revenue from paid invoices
    const revenueResult = await this.db.$queryRaw`
      SELECT COALESCE(SUM("totalAmount"), 0) as total
      FROM billing."Invoice"
      WHERE "organizationId" = ${organizationId}
        AND "status" IN ('PAID', 'PARTIALLY_PAID')
        AND "paidAt" >= ${startOfDay}
        AND "paidAt" < ${endOfDay}
    `;

    const totalRevenue = (revenueResult as { total: bigint }[])[0]?.total ?? 0n;

    // Sum expenses
    const expenseResult = await this.db.$queryRaw`
      SELECT COALESCE(SUM("amount"), 0) as total
      FROM billing."ExpenseRecord"
      WHERE "organizationId" = ${organizationId}
        AND "spentAt" >= ${startOfDay}
        AND "spentAt" < ${endOfDay}
    `;

    const totalExpense = (expenseResult as { total: bigint }[])[0]?.total ?? 0n;

    const netProfit = totalRevenue - totalExpense;

    // Upsert daily rollup
    await this.db.revenueRollup.upsert({
      where: {
        organizationId_periodType_periodDate: {
          organizationId,
          periodType: 'daily',
          periodDate: startOfDay,
        },
      },
      create: {
        organizationId,
        periodType: 'daily',
        periodDate: startOfDay,
        totalRevenue: totalRevenue.toString(),
        totalExpense: totalExpense.toString(),
        netProfit: netProfit.toString(),
      },
      update: {
        totalRevenue: totalRevenue.toString(),
        totalExpense: totalExpense.toString(),
        netProfit: netProfit.toString(),
      },
    });
  }

  /**
   * Roll up client growth metrics.
   */
  private async rollupClients(organizationId: string, date: Date) {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Total clients as of end of day
    const totalClientsResult = await this.db.$queryRaw`
      SELECT COUNT(*) as total
      FROM clients."Client"
      WHERE "organizationId" = ${organizationId}
        AND "createdAt" < ${endOfDay}
    `;

    const totalClients =
      (totalClientsResult as { total: bigint }[])[0]?.total ?? 0n;

    // New clients created today
    const newClientsResult = await this.db.$queryRaw`
      SELECT COUNT(*) as total
      FROM clients."Client"
      WHERE "organizationId" = ${organizationId}
        AND "createdAt" >= ${startOfDay}
        AND "createdAt" < ${endOfDay}
    `;

    const newClients =
      (newClientsResult as { total: bigint }[])[0]?.total ?? 0n;

    // Churned clients (status changed to INACTIVE or ARCHIVED today)
    const churnedClientsResult = await this.db.$queryRaw`
      SELECT COUNT(*) as total
      FROM clients."Client"
      WHERE "organizationId" = ${organizationId}
        AND "status" IN ('INACTIVE', 'ARCHIVED')
        AND "updatedAt" >= ${startOfDay}
        AND "updatedAt" < ${endOfDay}
    `;

    const churnedClients =
      (churnedClientsResult as { total: bigint }[])[0]?.total ?? 0n;

    // Upsert client rollup
    await this.db.clientRollup.upsert({
      where: {
        organizationId_periodDate: {
          organizationId,
          periodDate: startOfDay,
        },
      },
      create: {
        organizationId,
        periodDate: startOfDay,
        totalClients: Number(totalClients.toString()),
        newClients: Number(newClients.toString()),
        churnedClients: Number(churnedClients.toString()),
      },
      update: {
        totalClients: Number(totalClients.toString()),
        newClients: Number(newClients),
        churnedClients: Number(churnedClients),
      },
    });
  }

  /**
   * Roll up team performance metrics for the month containing the given date.
   */
  private async rollupTeamPerformance(organizationId: string, date: Date) {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    // Get all employees in the organization
    const employees = await this.db.employee.findMany({
      where: { organizationId },
      select: { id: true, userId: true },
    });

    for (const employee of employees) {
      // Count completed tasks
      const tasksCompletedResult = await this.db.$queryRaw`
        SELECT COUNT(*) as total
        FROM projects."Task"
        WHERE "assignedToId" = ${employee.userId}
          AND "status" = 'DONE'
          AND "updatedAt" >= ${monthStart}
          AND "updatedAt" < ${monthEnd}
      `;

      const tasksCompleted =
        (tasksCompletedResult as { total: bigint }[])[0]?.total ?? 0n;

      // Sum hours logged
      const hoursLoggedResult = await this.db.$queryRaw`
        SELECT COALESCE(SUM("minutes"), 0) as total
        FROM projects."TimeLog"
        WHERE "userId" = ${employee.userId}
          AND "loggedAt" >= ${monthStart}
          AND "loggedAt" < ${monthEnd}
      `;

      const totalMinutes =
        (hoursLoggedResult as { total: bigint }[])[0]?.total ?? 0n;
      const hoursLogged = Number(totalMinutes) / 60;

      // Count resolved tickets (where employee was assigned and ticket resolved)
      const ticketsResolvedResult = await this.db.$queryRaw`
        SELECT COUNT(DISTINCT t.id) as total
        FROM helpdesk."Ticket" t
        INNER JOIN helpdesk."TicketAssignment" ta
          ON t.id = ta."ticketId" AND ta."employeeId" = ${employee.id} AND ta."isActive" = true
        WHERE t."organizationId" = ${organizationId}
          AND t."status" IN ('RESOLVED', 'CLOSED')
          AND t."resolvedAt" >= ${monthStart}
          AND t."resolvedAt" < ${monthEnd}
      `;

      const ticketsResolved =
        (ticketsResolvedResult as { total: bigint }[])[0]?.total ?? 0n;

      // Upsert team performance rollup
      await this.db.teamPerformanceRollup.upsert({
        where: {
          employeeId_periodDate: {
            employeeId: employee.id,
            periodDate: monthStart,
          },
        },
        create: {
          employeeId: employee.id,
          organizationId,
          periodDate: monthStart,
          tasksCompleted: Number(tasksCompleted),
          hoursLogged: hoursLogged,
          ticketsResolved: Number(ticketsResolved),
        },
        update: {
          tasksCompleted: Number(tasksCompleted),
          hoursLogged: hoursLogged,
          ticketsResolved: Number(ticketsResolved),
        },
      });
    }
  }
}
