import { Module } from '@nestjs/common';
import { DepartmentsModule } from '../departments/departments.module';
import { RoutingModule } from '../routing/routing.module';
import { SlaModule } from '../sla/sla.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketAuthorizationService } from './ticket-authorization.service';
import { TicketNotificationsService } from './ticket-notifications.service';

/**
 * Ticket lifecycle module.
 *
 * The service composes the SLA engine, routing rules and department
 * modules so creation resolves department / agent / SLA policy from
 * database configuration rather than hardcoded defaults.
 *
 * PrismaService, UnitOfWorkService, AuditService and OutboxPublisher
 * are provided by the global DatabaseModule.
 */
@Module({
  imports: [SlaModule, RoutingModule, DepartmentsModule, NotificationsModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketAuthorizationService,
    TicketNotificationsService,
  ],
  exports: [TicketsService, TicketAuthorizationService],
})
export class TicketsModule {}
