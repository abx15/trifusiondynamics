import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowEngineService } from '../engine/workflow-engine.service';

@Injectable()
export class ScheduledWorkflowsJob {
  private readonly logger = new Logger(ScheduledWorkflowsJob.name);

  constructor(
    private readonly db: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledWorkflows() {
    this.logger.debug('Checking for SCHEDULED workflows...');
    // Bounded fetch: even though isActive is filtered, a tenant could accumulate
    // many scheduled workflows. A hard take cap prevents accidental memory
    // spikes on the cron tick.
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
        // Very rudimentary cron check for demo purposes (assumes something like "0 9 * * *")
        // A real implementation would parse the cron expression properly using a cron library
        // e.g. cron-parser module.
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
          // Run every minute/5 minutes
          this.logger.debug(`Triggering frequent scheduled workflow: ${wf.id}`);
          this.workflowEngine
            .execute(wf, { source: 'scheduled_trigger' })
            .catch(console.error);
        }
      }
    }
  }
}
