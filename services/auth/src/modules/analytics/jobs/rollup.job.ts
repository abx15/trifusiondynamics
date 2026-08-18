import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from '../analytics.service';

@Injectable()
export class RollupJob {
  private readonly logger = new Logger(RollupJob.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyRollup() {
    this.logger.debug('Running daily analytics rollup...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // In a real app, you would pass 'yesterday' to the service to compute stats
    await this.analyticsService.runRollupJobNow(yesterday.toISOString());
    this.logger.debug('Daily rollup completed.');
  }
}
