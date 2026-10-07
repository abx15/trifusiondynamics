import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxProcessorService } from './outbox-processor.service';

/**
 * Polls the transactional outbox.
 *
 * Every 5 seconds the processor claims due events with
 * `FOR UPDATE SKIP LOCKED`, delivers their side effects
 * (webhooks today, WebSocket push in Phase 9) and marks
 * them PROCESSED. The interval is deliberately short:
 * webhook consumers expect near-real-time delivery, and
 * an empty sweep is a single indexed SELECT.
 */
@Injectable()
export class OutboxProcessorJob {
  private readonly logger = new Logger(OutboxProcessorJob.name);

  constructor(private readonly processor: OutboxProcessorService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async poll(): Promise<void> {
    try {
      const processed = await this.processor.runOnce();
      if (processed > 0) {
        this.logger.debug(`Outbox sweep processed ${processed} event(s)`);
      }
    } catch (error) {
      // The sweep itself failed (e.g. database unreachable).
      // Events stay PENDING and the next tick retries; the
      // exponential backoff on individual failures prevents
      // a poison event from hammering anything.
      this.logger.error(
        `Outbox sweep failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
