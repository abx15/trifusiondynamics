import { Injectable, Logger, Inject } from '@nestjs/common';
import { Worker, Job, QueueEvents } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from './queue.constants';
import { EmailQueueProcessor } from './processors/email.processor';
import { WebhookQueueProcessor } from './processors/webhook.processor';
import { AnalyticsQueueProcessor } from './processors/analytics.processor';

@Injectable()
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);
  private readonly workers: Worker[] = [];

  constructor(
    @Inject('BullQueue_emails') private readonly emailsQueue: any,
    @Inject('BullQueue_webhooks') private readonly webhooksQueue: any,
    @Inject('BullQueue_analytics') private readonly analyticsQueue: any,
    private readonly emailProcessor: EmailQueueProcessor,
    private readonly webhookProcessor: WebhookQueueProcessor,
    private readonly analyticsProcessor: AnalyticsQueueProcessor,
  ) {}

  async onModuleInit() {
    if (!this.emailsQueue?.client || !this.webhooksQueue?.client || !this.analyticsQueue?.client) {
      this.logger.warn('BullMQ queues are not ready yet; skipping worker startup');
      return;
    }

    await this.initializeWorkers();
  }

  private getConnection() {
    return this.emailsQueue.client.options;
  }

  private async initializeWorkers() {
    const connection = this.getConnection();

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

    this.workers.push(analyticsWorker);

    // Initialize queue events for monitoring
    this.initializeQueueEvents();

    this.logger.log('All BullMQ workers initialized');
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
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
        },
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
    }
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    this.logger.log('All BullMQ workers closed');
  }
}
