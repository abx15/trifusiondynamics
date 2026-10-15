import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SecretsService } from '../../secrets/secrets.service';
import { RedisService, redisKey } from '../../database/redis.service';

interface WebhookJobData {
  webhookId: string;
  url: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
  organizationId: string;
  attempt?: number;
}

@Injectable()
export class WebhookQueueProcessor {
  private readonly logger = new Logger(WebhookQueueProcessor.name);
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 5000;

  constructor(
    private readonly secrets: SecretsService,
    private readonly redis: RedisService,
  ) {}

  async process(
    data: WebhookJobData,
    job: Job,
  ): Promise<{ delivered: boolean; statusCode?: number }> {
    this.logger.log(
      `Delivering webhook ${data.webhookId} to ${data.url} (attempt ${job.attemptsMade + 1})`,
    );

    try {
      // Check if we should skip due to circuit breaker
      const circuitOpen = await this.isCircuitOpen(data.url);
      if (circuitOpen) {
        this.logger.warn(`Circuit breaker open for ${data.url}, re-queueing`);
        throw new Error('Circuit breaker open');
      }

      const response = await this.deliverWebhook(data);
      const success = response.ok;

      if (success) {
        // Reset circuit breaker on success
        await this.resetCircuitBreaker(data.url);
        this.logger.log(`Webhook ${data.webhookId} delivered successfully`);
        return { delivered: true, statusCode: response.status };
      } else {
        // Record failure for circuit breaker
        await this.recordFailure(data.url);
        this.logger.warn(
          `Webhook ${data.webhookId} failed with status ${response.status}`,
        );
        throw new Error(`Webhook failed with status ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Webhook ${data.webhookId} delivery failed:`, error);

      // Record failure for circuit breaker
      await this.recordFailure(data.url);

      // If max retries reached, record as permanently failed
      if (job.attemptsMade >= this.MAX_RETRIES - 1) {
        await this.recordPermanentFailure(data.webhookId, error);
      }

      throw error; // Re-throw for BullMQ retry
    }
  }

  private async deliverWebhook(
    data: WebhookJobData,
  ): Promise<{ ok: boolean; status: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(data.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgencyOS-Webhooks/1.0',
          ...data.headers,
        },
        body: JSON.stringify(data.payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return { ok: response.ok, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Webhook timeout');
      }
      throw error;
    }
  }

  private async isCircuitOpen(url: string): Promise<boolean> {
    const key = redisKey('lock', `circuit:${url}`);
    const value = await this.redis.get(key);
    return value === 'open';
  }

  private async recordFailure(url: string): Promise<void> {
    const key = redisKey('ratelimit', `failures:${url}`);
    const count = await this.redis.incr(key, 300); // 5 minute window

    if (count && count >= 5) {
      // Open circuit breaker
      await this.redis.set(redisKey('lock', `circuit:${url}`), 'open', 300); // 5 minutes
      this.logger.warn(
        `Circuit breaker opened for ${url} after ${count} failures`,
      );
    }
  }

  private async resetCircuitBreaker(url: string): Promise<void> {
    await this.redis.del(redisKey('lock', `circuit:${url}`));
    await this.redis.del(redisKey('ratelimit', `failures:${url}`));
  }

  private async recordPermanentFailure(
    webhookId: string,
    error: Error,
  ): Promise<void> {
    // In a real implementation, you would:
    // 1. Store the failed webhook in a dead letter queue / database
    // 2. Send an alert to the webhook owner
    // 3. Potentially disable the webhook automatically

    this.logger.error(
      `Webhook ${webhookId} permanently failed after ${this.MAX_RETRIES} attempts: ${error.message}`,
    );

    // Could use Prisma to store in a dead_letter_webhooks table
    // await this.prisma.deadLetterWebhook.create({ ... })
  }
}
