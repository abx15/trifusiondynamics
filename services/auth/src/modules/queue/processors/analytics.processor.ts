import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';

interface AnalyticsRollupJobData {
  organizationId: string;
  rollupType: 'hourly' | 'daily' | 'weekly' | 'monthly';
  date?: string;
  metrics?: string[];
}

@Injectable()
export class AnalyticsQueueProcessor {
  private readonly logger = new Logger(AnalyticsQueueProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(
    data: AnalyticsRollupJobData,
    job: Job,
  ): Promise<{ processed: boolean; records: number }> {
    const date = data.date ? new Date(data.date) : new Date();
    this.logger.log(
      `Processing ${data.rollupType} analytics rollup for org ${data.organizationId} on ${date.toISOString()}`,
    );

    try {
      let records = 0;

      switch (data.rollupType) {
        case 'hourly':
          records = await this.rollupHourly(data.organizationId, date);
          break;
        case 'daily':
          records = await this.rollupDaily(data.organizationId, date);
          break;
        case 'weekly':
          records = await this.rollupWeekly(data.organizationId, date);
          break;
        case 'monthly':
          records = await this.rollupMonthly(data.organizationId, date);
          break;
      }

      this.logger.log(
        `${data.rollupType} rollup completed: ${records} records processed`,
      );
      return { processed: true, records };
    } catch (error) {
      this.logger.error(
        `${data.rollupType} rollup failed for org ${data.organizationId}:`,
        error,
      );
      throw error;
    }
  }

  private async rollupHourly(
    organizationId: string,
    date: Date,
  ): Promise<number> {
    const startOfHour = new Date(date);
    startOfHour.setMinutes(0, 0, 0);

    const endOfHour = new Date(startOfHour);
    endOfHour.setHours(endOfHour.getHours() + 1);

    // Example: Roll up lead conversions, revenue, activities
    // Using existing models - adjust based on actual schema
    const [leadCount] = await Promise.all([
      this.prisma.lead.count({
        where: {
          organizationId,
          createdAt: { gte: startOfHour, lt: endOfHour },
        },
      }),
    ]);

    this.logger.debug(`Hourly rollup: ${leadCount} leads in hour`);

    // In a real implementation, you would store in an analytics_rollup table
    // For now, just log the results
    return 1;
  }

  private async rollupDaily(
    organizationId: string,
    date: Date,
  ): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Example: Aggregate daily metrics
    const [leadCount, revenueSum] = await Promise.all([
      this.prisma.lead.count({
        where: {
          organizationId,
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
      }),
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startOfDay, lt: endOfDay },
          status: 'PAID',
        },
        _sum: { totalAmount: true },
      }),
    ]);

    this.logger.debug(
      `Daily rollup: ${leadCount} leads, ${revenueSum._sum.totalAmount || 0} revenue`,
    );

    // In a real implementation, you would store in an analytics_rollup table
    return 1;
  }

  private async rollupWeekly(
    organizationId: string,
    date: Date,
  ): Promise<number> {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay(); // 0 = Sunday
    startOfWeek.setDate(startOfWeek.getDate() - day); // Go to Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Aggregate daily metrics for the week
    const [leadCount, revenueSum] = await Promise.all([
      this.prisma.lead.count({
        where: {
          organizationId,
          createdAt: { gte: startOfWeek, lt: endOfWeek },
        },
      }),
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startOfWeek, lt: endOfWeek },
          status: 'PAID',
        },
        _sum: { totalAmount: true },
      }),
    ]);

    this.logger.debug(
      `Weekly rollup: ${leadCount} leads, ${revenueSum._sum.totalAmount || 0} revenue`,
    );

    return 1;
  }

  private async rollupMonthly(
    organizationId: string,
    date: Date,
  ): Promise<number> {
    const startOfMonth = new Date(date);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Aggregate daily metrics for the month
    const [leadCount, revenueSum] = await Promise.all([
      this.prisma.lead.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
      }),
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth, lt: endOfMonth },
          status: 'PAID',
        },
        _sum: { totalAmount: true },
      }),
    ]);

    this.logger.debug(
      `Monthly rollup: ${leadCount} leads, ${revenueSum._sum.totalAmount || 0} revenue`,
    );

    return 1;
  }
}
