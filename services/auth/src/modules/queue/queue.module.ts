import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { EmailQueueProcessor } from './processors/email.processor';
import { WebhookQueueProcessor } from './processors/webhook.processor';
import { AnalyticsQueueProcessor } from './processors/analytics.processor';
import { QUEUE_NAMES } from './queue.constants';
import {
  getQueueRedisConnection,
  isRedisConfigured,
} from './queue.redis.config';

const QUEUE_NAMES_LIST = [
  { name: QUEUE_NAMES.EMAILS },
  { name: QUEUE_NAMES.WEBHOOKS },
  { name: QUEUE_NAMES.ANALYTICS },
  { name: QUEUE_NAMES.NOTIFICATIONS },
  { name: QUEUE_NAMES.CLEANUP },
];

const bullMqImports = isRedisConfigured()
  ? [
      BullModule.forRootAsync({
        useFactory: () => ({
          connection: getQueueRedisConnection(),
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
      BullModule.registerQueue(...QUEUE_NAMES_LIST),
    ]
  : [];

const queueProcessors = [
  EmailQueueProcessor,
  WebhookQueueProcessor,
  AnalyticsQueueProcessor,
];

@Global()
@Module({
  imports: [...bullMqImports],
  providers: [QueueService, QueueProcessor, ...queueProcessors],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
