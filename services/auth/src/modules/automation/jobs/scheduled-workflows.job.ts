import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { WorkflowEngineService } from '../engine/workflow-engine.service';

@Injectable()
export class ScheduledWorkflowsJob implements OnModuleInit {
  private readonly logger = new Logger(ScheduledWorkflowsJob.name);

  constructor(
    private readonly db: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.log(
      'ScheduledWorkflowsJob initialized (Redis distributed lock enabled)',
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledWorkflows() {
    const lockKey = 'lock:job:scheduled_workflows';
    const lockTtl = 600; // 10 minutes — safely covers the job execution window

    const lockToken = await this.redis.acquireLock(lockKey, lockTtl);
    if (!lockToken) {
      // Another instance is already running this job.
      this.logger.debug(
        'ScheduledWorkflowsJob: lock held by another instance, skipping',
      );
      return;
    }

    try {
      this.logger.debug('Checking for SCHEDULED workflows...');
      const workflows = await this.db.workflow.findMany({
        where: {
          isActive: true,
          triggerType: 'SCHEDULED',
        },
        take: 1000,
      });

      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();

      for (const wf of workflows) {
        const config = wf.triggerConfig as any;
        if (config && config.cron) {
          if (
            config.cron === '0 9 * * *' &&
            currentHour === 9 &&
            currentMinute < 5
          ) {
            this.logger.debug(`Triggering scheduled workflow: ${wf.id}`);
            this.workflowEngine
              .execute(wf, { source: 'scheduled_trigger' })
              .catch(console.error);
          } else if (config.cron === '* * * * *') {
            this.logger.debug(
              `Triggering frequent scheduled workflow: ${wf.id}`,
            );
            this.workflowEngine
              .execute(wf, { source: 'scheduled_trigger' })
              .catch(console.error);
          }
        }
      }
    } finally {
      await this.redis.releaseLock(lockKey, lockToken);
    }
  }
}
