import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { WorkflowEngineService } from './engine/workflow-engine.service';
import { LeadEventsListener } from './listeners/lead-events.listener';
import { ScheduledWorkflowsJob } from './jobs/scheduled-workflows.job';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    WorkflowEngineService,
    LeadEventsListener,
    ScheduledWorkflowsJob,
  ],
})
export class AutomationModule {}
