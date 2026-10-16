import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job, QueueEvents } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from './queue.constants';
import {
  getQueueRedisConnection,
  isRedisConfigured,
} from './queue.redis.config';
import { EmailQueueProcessor } from './processors/email.processor';
import { WebhookQueueProcessor } from './processors/webhook.processor';
import { AnalyticsQueueProcessor } from './processors/analytics.processor';

@Injectable()
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);
  private readonly workers: Worker[] = [];
  private readonly queueEvents: QueueEvents[] = [];

  constructor(
    private readonly emailProcessor: EmailQueueProcessor,
    private readonly webhookProcessor: WebhookQueueProcessor,
    private readonly analyticsProcessor: AnalyticsQueueProcessor,
  ) {}

  onModuleInit() {
    this.initializeWorkers();
  }

  private initializeWorkers() {
    if (!isRedisConfigured()) {
      this.logger.warn(
        'Redis not configured via REDIS_URL — BullMQ workers disabled; queues will not run',
      );
      return;
    }

    const connection = getQueueRedisConnection(null);

    // Email worker
    const emailWorker = new Worker(
      QUEUE_NAMES.EMAILS,
      async (job: Job) => {
        return this.handleJob(job, this.emailProcessor);
      },
      {
        connection,
        concurrency: 10,
        limiter: {
          max: 100,
          duration: 60000, // 100 jobs per minute
        },
      },
    );

    emailWorker.on(QUEUE_EVENTS.JOB_COMPLETED, (job) => {
      this.logger.debug(`Email job ${job.id} completed`);
    });
    emailWorker.on(QUEUE_EVENTS.JOB_FAILED, (job, err) => {
      this.logger.error(`Email job ${job?.id} failed:`, err);
    });
    emailWorker.on(QUEUE_EVENTS.JOB_STALLED, (jobId) => {
      this.logger.warn(`Email job ${jobId} stalled`);
    });
    emailWorker.on('error', (error) => {
      this.logger.error('Email worker connection failed', error);
    });

    this.workers.push(emailWorker);

    // Webhook worker
    const webhookWorker = new Worker(
      QUEUE_NAMES.WEBHOOKS,
      async (job: Job) => {
        return this.handleJob(job, this.webhookProcessor);
      },
      {
        connection,
        concurrency: 5,
        limiter: {
          max: 50,
          duration: 60000,
        },
      },
    );

    webhookWorker.on(QUEUE_EVENTS.JOB_COMPLETED, (job) => {
      this.logger.debug(`Webhook job ${job.id} completed`);
    });
    webhookWorker.on(QUEUE_EVENTS.JOB_FAILED, (job, err) => {
      this.logger.error(`Webhook job ${job?.id} failed:`, err);
    });
    webhookWorker.on(QUEUE_EVENTS.JOB_STALLED, (jobId) => {
      this.logger.warn(`Webhook job ${jobId} stalled`);
    });
    webhookWorker.on('error', (error) => {
      this.logger.error('Webhook worker connection failed', error);
    });

    this.workers.push(webhookWorker);

    // Analytics worker
    const analyticsWorker = new Worker(
      QUEUE_NAMES.ANALYTICS,
      async (job: Job) => {
        return this.handleJob(job, this.analyticsProcessor);
      },
      {
        connection,
        concurrency: 2,
      },
    );

    analyticsWorker.on(QUEUE_EVENTS.JOB_COMPLETED, (job) => {
      this.logger.debug(`Analytics job ${job.id} completed`);
    });
    analyticsWorker.on(QUEUE_EVENTS.JOB_FAILED, (job, err) => {
      this.logger.error(`Analytics job ${job?.id} failed:`, err);
    });
    analyticsWorker.on(QUEUE_EVENTS.JOB_STALLED, (jobId) => {
      this.logger.warn(`Analytics job ${jobId} stalled`);
    });
    analyticsWorker.on('error', (error) => {
      this.logger.error('Analytics worker connection failed', error);
    });

    this.workers.push(analyticsWorker);

    // Initialize queue events for monitoring
    this.initializeQueueEvents();

    this.logger.log('BullMQ workers registered');
  }

  private async handleJob(job: Job, processor: any): Promise<any> {
    const startTime = Date.now();
    this.logger.debug(`Processing job ${job.id} (${job.name})`);

    try {
      const result = await processor.process(job.data, job);
      const duration = Date.now() - startTime;
      this.logger.debug(`Job ${job.id} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Job ${job.id} failed after ${duration}ms:`, error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  private initializeQueueEvents() {
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queueEvents = new QueueEvents(queueName, {
        connection: getQueueRedisConnection(null),
      });
      queueEvents.on('error', (error) => {
        this.logger.error(
          `Queue events connection failed for ${queueName}`,
          error,
        );
      });

      queueEvents.on('waiting', ({ jobId }) => {
        this.logger.debug(`Job ${jobId} waiting in ${queueName}`);
      });
      queueEvents.on('active', ({ jobId }) => {
        this.logger.debug(`Job ${jobId} active in ${queueName}`);
      });
      queueEvents.on('stalled', ({ jobId }) => {
        this.logger.warn(`Job ${jobId} stalled in ${queueName}`);
      });
      queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.logger.error(
          `Job ${jobId} failed in ${queueName}: ${failedReason}`,
        );
      });
      queueEvents.on('completed', ({ jobId }) => {
        this.logger.debug(`Job ${jobId} completed in ${queueName}`);
      });
      this.queueEvents.push(queueEvents);
    }
  }

  async onModuleDestroy() {
    await Promise.all([
      ...this.workers.map((worker) => worker.close()),
      ...this.queueEvents.map((queueEvents) => queueEvents.close()),
    ]);
    this.logger.log('All BullMQ workers and events closed');
  }
}
