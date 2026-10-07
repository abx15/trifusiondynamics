import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { isUniqueViolation } from '../../../common/events/outbox.publisher';
import * as crypto from 'crypto';

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(private readonly db: PrismaService) {}

  @OnEvent('invoice.paid')
  async handleInvoicePaid(payload: any) {
    await this.dispatch('invoice.paid', payload);
  }

  @OnEvent('lead.created')
  async handleLeadCreated(payload: any) {
    await this.dispatch('lead.created', payload);
  }

  @OnEvent('ticket.resolved')
  async handleTicketResolved(payload: any) {
    await this.dispatch('ticket.resolved', payload);
  }

  /**
   * Delivers an event to every active webhook subscribed
   * to it. Called by the outbox processor (with
   * `outboxEventId`) and by the legacy EventEmitter2
   * listeners above (without).
   *
   * Exactly-once for outbox events: the delivery row
   * carries the outbox event id, and the partial unique
   * index on (webhookId, outboxEventId) makes a
   * redelivered event (e.g. after a crash between
   * delivery and acknowledgement) a no-op rather than a
   * duplicate POST.
   */
  async dispatch(
    eventName: string,
    payload: any,
    outboxEventId?: string | null,
  ): Promise<void> {
    this.logger.debug(`Dispatching webhook for event: ${eventName}`);
    const organizationId = payload?.organizationId;

    if (!organizationId) {
      this.logger.warn(
        `Cannot dispatch webhook for ${eventName}: Missing organizationId in payload.`,
      );
      return;
    }

    // Find all active webhooks subscribed to this event in the organization
    const webhooks = await this.db.webhook.findMany({
      where: {
        organizationId,
        isActive: true,
        events: {
          has: eventName,
        },
      },
    });

    for (const webhook of webhooks) {
      // Create delivery record
      try {
        const delivery = await this.db.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event: eventName,
            payload,
            attempt: 1,
            ...(outboxEventId ? { outboxEventId } : {}),
          },
        });

        // Fire and forget the delivery (simulate queue)
        this.executeDelivery(webhook, delivery, payload).catch((e) =>
          this.logger.error(e),
        );
      } catch (error) {
        // The unique (webhookId, outboxEventId) constraint
        // fired: this event was already delivered to this
        // webhook. The duplicate is the retry, not a failure.
        if (outboxEventId && isUniqueViolation(error)) {
          this.logger.debug(
            `Webhook ${webhook.id} already received outbox event ${outboxEventId}; skipping duplicate`,
          );
          continue;
        }
        throw error;
      }
    }
  }

  private async executeDelivery(webhook: any, delivery: any, payload: any) {
    const payloadStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(payloadStr)
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trifusion-Signature': signature,
          'X-Trifusion-Event': delivery.event,
        },
        body: payloadStr,
      });

      await this.db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          statusCode: response.status,
          success: response.ok,
        },
      });

      this.logger.debug(
        `Webhook delivery ${delivery.id} completed with status ${response.status}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Webhook delivery ${delivery.id} failed: ${error.message}`,
      );
      await this.db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          statusCode: 500,
          success: false,
        },
      });

      // In a real system with BullMQ, we would throw an error here to trigger the exponential backoff retry.
      // For this implementation, we will log it.
    }
  }
}
