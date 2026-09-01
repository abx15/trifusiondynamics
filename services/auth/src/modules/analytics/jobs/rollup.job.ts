import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from '../analytics.service';
import { RedisService } from '../../database/redis.service';

@Injectable()
export class RollupJob {
  private readonly logger = new Logger(RollupJob.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyRollup() {
    const lockKey = 'lock:job:analytics_rollup';
    const lockTtl = 3600; // 1 hour — safely covers daily rollup execution

    const lockToken = await this.redis.acquireLock(lockKey, lockTtl);
    if (!lockToken) {
      this.logger.debug('RollupJob: lock held by another instance, skipping');
      return;
    }

    try {
      this.logger.debug('Running daily analytics rollup...');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await this.analyticsService.runRollupJobNow(yesterday.toISOString());
      this.logger.debug('Daily rollup completed.');
    } finally {
      await this.redis.releaseLock(lockKey, lockToken);
    }
  }
}
