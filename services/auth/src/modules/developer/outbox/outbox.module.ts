import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { GatewayModule } from '../../../gateway/gateway.module';
import { OutboxController } from './outbox.controller';
import { OutboxProcessorService } from '../../../common/events/outbox-processor.service';
import { OutboxProcessorJob } from '../../../common/events/outbox-processor.job';

/**
 * Outbox processing.
 *
 * The processor fans out to webhooks (via
 * WebhookDispatcherService) and to WebSocket clients
 * (via the TicketEventsGateway from GatewayModule).
 * PrismaService, UnitOfWorkService, AuditService and
 * OutboxPublisher come from the global DatabaseModule.
 */
@Module({
  imports: [WebhooksModule, GatewayModule],
  controllers: [OutboxController],
  providers: [OutboxProcessorService, OutboxProcessorJob],
  exports: [OutboxProcessorService],
})
export class OutboxModule {}
