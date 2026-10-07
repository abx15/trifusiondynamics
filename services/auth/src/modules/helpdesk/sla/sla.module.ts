import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module';
import { SlaPoliciesController } from './sla-policies.controller';
import { SlaPoliciesService } from './sla-policies.service';
import { SlaEngineService } from './sla-engine.service';
import { SlaMonitorJob } from './sla-monitor.job';

@Module({
  imports: [NotificationsModule],
  controllers: [SlaPoliciesController],
  providers: [SlaPoliciesService, SlaEngineService, SlaMonitorJob],
  exports: [SlaPoliciesService, SlaEngineService],
})
export class SlaModule {}
