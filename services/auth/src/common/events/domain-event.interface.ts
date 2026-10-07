/** Domain event names published to the transactional outbox. */
export const DOMAIN_EVENTS = {
  TICKET_CREATED: 'ticket.created',
  TICKET_ASSIGNED: 'ticket.assigned',
  TICKET_UNASSIGNED: 'ticket.unassigned',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_STATUS_CHANGED: 'ticket.status_changed',
  TICKET_COMMENT_ADDED: 'ticket.comment_added',
  TICKET_ATTACHMENT_ADDED: 'ticket.attachment_added',
  TICKET_RESOLUTION_SUBMITTED: 'ticket.resolution_submitted',
  TICKET_RESOLUTION_VERIFIED: 'ticket.resolution_verified',
  TICKET_RESOLUTION_REJECTED: 'ticket.resolution_rejected',
  TICKET_REOPENED: 'ticket.reopened',
  TICKET_RESOLVED: 'ticket.resolved',
  TICKET_CLOSED: 'ticket.closed',
  TICKET_CANCELLED: 'ticket.cancelled',
  TICKET_CLIENT_CONFIRMED: 'ticket.client_confirmed',
  TICKET_ESCALATED: 'ticket.escalated',
  TICKET_ESCALATION_CLEARED: 'ticket.escalation_cleared',
  SLA_RESPONSE_WARNING: 'sla.response_warning',
  SLA_RESPONSE_BREACHED: 'sla.response_breached',
  SLA_RESOLUTION_WARNING: 'sla.resolution_warning',
  SLA_RESOLUTION_BREACHED: 'sla.resolution_breached',
  DEPARTMENT_CREATED: 'department.created',
  DEPARTMENT_UPDATED: 'department.updated',
  ROUTING_RULE_CREATED: 'routing_rule.created',
  ROUTING_RULE_UPDATED: 'routing_rule.updated',
  SLA_POLICY_CREATED: 'sla_policy.created',
  SLA_POLICY_UPDATED: 'sla_policy.updated',
} as const;

export type DomainEventType =
  (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

/** Envelope written to `outbox.OutboxEvent.payload`. */
export interface DomainEventEnvelope<T = Record<string, unknown>> {
  /** OutboxEvent.id — the delivery identifier, used for idempotency. */
  eventId: string;
  eventType: string;
  organizationId: string | null;
  /** Correlation id shared by every event produced by one business operation. */
  correlationId: string;
  actorId: string | null;
  occurredAt: string;
  data: T;
}

export interface OutboxPublisherLike {
  publish<T>(
    tx: import('../prisma/unit-of-work.service').Tx,
    event: {
      eventType: string;
      organizationId?: string | null;
      actorId?: string | null;
      correlationId?: string;
      /** Producer-supplied dedupe key; identical keys are never stored twice. */
      idempotencyKey?: string;
      data: T;
    },
  ): Promise<{ eventId: string }>;
}
