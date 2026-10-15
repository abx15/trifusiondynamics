import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from './queue.constants';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    @Inject('BullQueue_emails') private readonly emailsQueue: Queue,
    @Inject('BullQueue_webhooks') private readonly webhooksQueue: Queue,
    @Inject('BullQueue_analytics') private readonly analyticsQueue: Queue,
    @Inject('BullQueue_notifications')
    private readonly notificationsQueue: Queue,
    @Inject('BullQueue_cleanup') private readonly cleanupQueue: Queue,
  ) {
    this.queues.set(QUEUE_NAMES.EMAILS, this.emailsQueue);
    this.queues.set(QUEUE_NAMES.WEBHOOKS, this.webhooksQueue);
    this.queues.set(QUEUE_NAMES.ANALYTICS, this.analyticsQueue);
    this.queues.set(QUEUE_NAMES.NOTIFICATIONS, this.notificationsQueue);
    this.queues.set(QUEUE_NAMES.CLEANUP, this.cleanupQueue);
  }

  async onModuleInit() {
    // Wait for all queues to be ready
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.waitUntilReady()),
    );
    this.logger.log('All BullMQ queues are ready');
  }

  /**
   * Add an email job to the queue
   */
  async addEmailJob(data: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
    organizationId: string;
    priority?: 'high' | 'normal' | 'low';
  }) {
    return this.emailsQueue.add('send-email', data, {
      priority: this.getPriorityValue(data.priority || 'normal'),
      jobId: `email:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`,
    });
  }

  /**
   * Add a webhook delivery job to the queue
   */
  async addWebhookJob(data: {
    webhookId: string;
    url: string;
    payload: Record<string, any>;
    headers?: Record<string, string>;
    maxRetries?: number;
    organizationId: string;
  }) {
    return this.webhooksQueue.add('deliver-webhook', data, {
      attempts: data.maxRetries || 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      jobId: `webhook:${data.webhookId}:${Date.now()}`,
    });
  }

  /**
   * Add an analytics rollup job
   */
  async addAnalyticsRollupJob(data: {
    organizationId: string;
    rollupType: 'hourly' | 'daily' | 'weekly' | 'monthly';
    date?: string; // ISO date string, defaults to now
    metrics?: string[];
  }) {
    return this.analyticsQueue.add('rollup', data, {
      priority: 5, // Lower priority than user-facing jobs
      jobId: `analytics:${data.rollupType}:${data.organizationId}:${data.date || Date.now()}`,
    });
  }

  /**
   * Add a notification job
   */
  async addNotificationJob(data: {
    userId: string;
    type: 'email' | 'push' | 'in-app' | 'sms';
    title: string;
    body: string;
    data?: Record<string, any>;
    organizationId: string;
    priority?: 'high' | 'normal' | 'low';
  }) {
    return this.notificationsQueue.add('send-notification', data, {
      priority: this.getPriorityValue(data.priority || 'normal'),
      jobId: `notification:${data.userId}:${Date.now()}`,
    });
  }

  /**
   * Add a cleanup job (e.g., delete old logs, expired tokens, etc.)
   */
  async addCleanupJob(data: {
    type: 'logs' | 'tokens' | 'webhooks' | 'sessions' | 'audit';
    olderThanDays: number;
    organizationId?: string;
  }) {
    return this.cleanupQueue.add('cleanup', data, {
      priority: 1, // Lowest priority
      delay: 60000, // Start after 1 minute
      jobId: `cleanup:${data.type}:${Date.now()}`,
    });
  }

  /**
   * Add a custom job to any queue
   */
  async addJob<T extends Record<string, any>>(
    queueName: string,
    jobName: string,
    data: T,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      delay?: number;
      attempts?: number;
      jobId?: string;
    },
  ) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.add(jobName, data, {
      priority: this.getPriorityValue(options?.priority || 'normal'),
      delay: options?.delay,
      attempts: options?.attempts || 3,
      jobId: options?.jobId,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get all queues statistics
   */
  async getAllQueueStats() {
    const stats: Record<string, any> = {};
    for (const [name, queue] of this.queues.entries()) {
      stats[name] = await this.getQueueStats(name);
    }
    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanQueue(
    queueName: string,
    gracePeriodMs = 24 * 60 * 60 * 1000,
    limit = 1000,
  ) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [completed, failed] = await Promise.all([
      queue.clean(gracePeriodMs, limit, 'completed'),
      queue.clean(gracePeriodMs, limit, 'failed'),
    ]);

    this.logger.log(
      `Cleaned queue ${queueName}: ${completed.length} completed, ${failed.length} failed`,
    );
    return { completed: completed.length, failed: failed.length };
  }

  private getPriorityValue(priority: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high':
        return 10;
      case 'normal':
        return 5;
      case 'low':
        return 1;
      default:
        return 5;
    }
  }
}
