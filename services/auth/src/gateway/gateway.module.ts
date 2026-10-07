import { Module } from '@nestjs/common';
import { TicketsModule } from '../modules/helpdesk/tickets/tickets.module';
import { TicketEventsGateway } from './ticket-events.gateway';

/**
 * Realtime gateway module.
 *
 * The gateway needs TicketAuthorizationService (exported by
 * TicketsModule) to authorize `subscribe` messages, and the
 * HTTP adapter (global) to attach the `/ws` upgrade handler.
 * OutboxModule imports this module so the outbox processor can
 * fan events out to connected clients.
 */
@Module({
  imports: [TicketsModule],
  providers: [TicketEventsGateway],
  exports: [TicketEventsGateway],
})
export class GatewayModule {}
