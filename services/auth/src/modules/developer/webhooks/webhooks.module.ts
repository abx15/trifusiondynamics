import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookDispatcherService],
})
export class WebhooksModule {}
