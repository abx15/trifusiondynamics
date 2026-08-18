import { Module } from '@nestjs/common';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RequestLogsController } from './request-logs/request-logs.controller';
import { PortalController } from './portal/portal.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ApiKeysModule, WebhooksModule, DatabaseModule],
  controllers: [RequestLogsController, PortalController],
})
export class DeveloperModule {}
