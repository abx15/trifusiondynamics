import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { EmailQueueProcessor } from './processors/email.processor';
import { WebhookQueueProcessor } from './processors/webhook.processor';
import { AnalyticsQueueProcessor } from './processors/analytics.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          username: process.env.REDIS_USERNAME || undefined,
          tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 200, 2000),
          enableReadyCheck: true,
          lazyConnect: true,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'emails' },
      { name: 'webhooks' },
      { name: 'analytics' },
      { name: 'notifications' },
      { name: 'cleanup' },
    ),
  ],
  providers: [
    QueueService,
    QueueProcessor,
    EmailQueueProcessor,
    WebhookQueueProcessor,
    AnalyticsQueueProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
