import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Worker, Job } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from './queue.constants';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    @Optional()
    @InjectQueue(QUEUE_NAMES.EMAILS)
    private readonly emailsQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.WEBHOOKS)
    private readonly webhooksQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.ANALYTICS)
    private readonly analyticsQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.CLEANUP)
    private readonly cleanupQueue?: Queue,
  ) {
    if (this.emailsQueue) this.queues.set(QUEUE_NAMES.EMAILS, this.emailsQueue);
    if (this.webhooksQueue)
      this.queues.set(QUEUE_NAMES.WEBHOOKS, this.webhooksQueue);
    if (this.analyticsQueue)
      this.queues.set(QUEUE_NAMES.ANALYTICS, this.analyticsQueue);
    if (this.notificationsQueue)
      this.queues.set(QUEUE_NAMES.NOTIFICATIONS, this.notificationsQueue);
    if (this.cleanupQueue)
      this.queues.set(QUEUE_NAMES.CLEANUP, this.cleanupQueue);
  }

  onModuleInit() {
    if (this.queues.size === 0) {
      this.logger.warn(
        'Redis not configured — BullMQ queues disabled; queue operations are no-ops',
      );
      return;
    }
    for (const queue of this.queues.values()) {
      queue.on('error', (error) => {
        this.logger.error(`Queue connection failed for ${queue.name}`, error);
      });
    }
    this.logger.log('BullMQ queues registered');
  }

  private requireQueue(queueName: string): Queue | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) {
      this.logger.warn(
        `Queue ${queueName} is disabled (Redis not configured); operation skipped`,
      );
    }
    return queue;
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
    const queue = this.requireQueue(QUEUE_NAMES.EMAILS);
    if (!queue) {
      return;
    }
    return queue.add('send-email', data, {
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
    const queue = this.requireQueue(QUEUE_NAMES.WEBHOOKS);
    if (!queue) {
      return;
    }
    return queue.add('deliver-webhook', data, {
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
    const queue = this.requireQueue(QUEUE_NAMES.ANALYTICS);
    if (!queue) {
      return;
    }
    return queue.add('rollup', data, {
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
    const queue = this.requireQueue(QUEUE_NAMES.NOTIFICATIONS);
    if (!queue) {
      return;
    }
    return queue.add('send-notification', data, {
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
    const queue = this.requireQueue(QUEUE_NAMES.CLEANUP);
    if (!queue) {
      return;
    }
    return queue.add('cleanup', data, {
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
    const queue = this.requireQueue(queueName);
    if (!queue) {
      return;
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
    const queue = this.requireQueue(queueName);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
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
    const queue = this.requireQueue(queueName);
    if (!queue) {
      return;
    }
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string) {
    const queue = this.requireQueue(queueName);
    if (!queue) {
      return;
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
    const queue = this.requireQueue(queueName);
    if (!queue) {
      return { completed: 0, failed: 0 };
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
