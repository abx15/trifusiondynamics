import { TicketStatus, TicketType } from '@prisma/client';

/**
 * The five actor capabilities that gate every ticket transition.
 * These come from the caller's LIVE roles/permissions — never from
 * `Ticket.requesterRoleSnapshot`, which exists only for display and history.
 */
export type TicketCapability =
  'requester' | 'assignee' | 'agent' | 'admin' | 'superAdmin';

export interface TransitionRule {
  from: TicketStatus;
  to: TicketStatus;
  /** Actor classes permitted to perform this transition. */
  allowed: readonly TicketCapability[];
  /** Human-readable reason, surfaced in the 409 response body. */
  description: string;
  /**
   * Some transitions may only run for certain ticket types. Omitted means the
   * transition is valid for every type.
   */
  types?: readonly TicketType[];
}

/**
 * Server-side state machine.
 *
 * There is intentionally NO `PATCH /tickets/:id/status` endpoint that accepts an
 * arbitrary status. Every mutation is a named business action
 * (assign / start-work / submit-resolution / verify / reopen / close ...) and each
 * one maps to a rule below, so an invalid or unauthorised transition is
 * rejected with 409 instead of corrupting the workflow.
 *
 * ESCALATED is absent from TicketStatus on purpose: escalation is orthogonal to
 * the lifecycle and lives in escalationLevel + TicketEscalation history, so
 * escalating a ticket can never destroy where it was in the flow.
 */
export const TICKET_TRANSITIONS: readonly TransitionRule[] = [
  // --- intake ---
  {
    from: TicketStatus.OPEN,
    to: TicketStatus.ASSIGNED,
    allowed: ['agent', 'admin', 'superAdmin'],
    description: 'An agent accepted the ticket and assigned it.',
  },
  {
    from: TicketStatus.OPEN,
    to: TicketStatus.IN_PROGRESS,
    allowed: ['assignee', 'agent', 'admin', 'superAdmin'],
    description: 'Work started before formal assignment.',
  },
  {
    from: TicketStatus.OPEN,
    to: TicketStatus.CANCELLED,
    allowed: ['requester', 'agent', 'admin', 'superAdmin'],
    description: 'The request was withdrawn before work began.',
  },

  // --- active work ---
  {
    from: TicketStatus.ASSIGNED,
    to: TicketStatus.IN_PROGRESS,
    allowed: ['assignee', 'agent', 'admin', 'superAdmin'],
    description: 'An assignee started working on the ticket.',
  },
  {
    from: TicketStatus.IN_PROGRESS,
    to: TicketStatus.WAITING_FOR_CLIENT,
    allowed: ['assignee', 'agent', 'admin', 'superAdmin'],
    description: 'Information is required from the requester.',
  },
  {
    from: TicketStatus.IN_PROGRESS,
    to: TicketStatus.WAITING_FOR_EMPLOYEE,
    allowed: ['assignee', 'agent', 'admin', 'superAdmin'],
    description: 'Blocked on an internal dependency.',
  },
  {
    from: TicketStatus.WAITING_FOR_CLIENT,
    to: TicketStatus.IN_PROGRESS,
    allowed: ['requester', 'assignee', 'agent', 'admin', 'superAdmin'],
    description: 'The awaited information arrived.',
  },
  {
    from: TicketStatus.WAITING_FOR_EMPLOYEE,
    to: TicketStatus.IN_PROGRESS,
    allowed: ['assignee', 'agent', 'admin', 'superAdmin'],
    description: 'The blocking dependency cleared.',
  },

  // --- resolution handoff ---
  {
    from: TicketStatus.IN_PROGRESS,
    to: TicketStatus.RESOLUTION_SUBMITTED,
    allowed: ['assignee', 'agent', 'admin', 'superAdmin'],
    description:
      'An assignee submitted a proposed resolution for verification.',
  },
  {
    from: TicketStatus.ASSIGNED,
    to: TicketStatus.RESOLUTION_SUBMITTED,
    allowed: ['assignee', 'agent', 'admin', 'superAdmin'],
    description: 'A resolution was submitted before work was marked started.',
  },
  {
    from: TicketStatus.RESOLUTION_SUBMITTED,
    to: TicketStatus.UNDER_VERIFICATION,
    allowed: ['agent', 'admin', 'superAdmin'],
    // An assignee may never verify their own work.
    description:
      'An agent picked up the submitted resolution for verification.',
  },
  {
    from: TicketStatus.UNDER_VERIFICATION,
    to: TicketStatus.RESOLVED,
    allowed: ['agent', 'admin', 'superAdmin'],
    description: 'The resolution was verified as correct.',
  },
  {
    from: TicketStatus.UNDER_VERIFICATION,
    to: TicketStatus.IN_PROGRESS,
    allowed: ['agent', 'admin', 'superAdmin'],
    description:
      'The resolution was rejected and the ticket went back to work.',
  },

  // --- client-facing closure ---
  {
    from: TicketStatus.RESOLVED,
    to: TicketStatus.CLOSED,
    allowed: ['requester', 'agent', 'admin', 'superAdmin'],
    description: 'The outcome was accepted and the ticket closed.',
  },
  {
    from: TicketStatus.RESOLVED,
    to: TicketStatus.REOPENED,
    allowed: ['requester', 'agent', 'admin', 'superAdmin'],
    types: [TicketType.CLIENT_SUPPORT],
    description: 'The requester reported that the problem still exists.',
  },

  // --- reopen ---
  {
    from: TicketStatus.REOPENED,
    to: TicketStatus.IN_PROGRESS,
    allowed: ['assignee', 'agent', 'admin', 'superAdmin'],
    description: 'Work resumed on a reopened ticket.',
  },
  {
    from: TicketStatus.REOPENED,
    to: TicketStatus.ASSIGNED,
    allowed: ['agent', 'admin', 'superAdmin'],
    description: 'A reopened ticket was reassigned.',
  },
  {
    from: TicketStatus.REOPENED,
    to: TicketStatus.CANCELLED,
    allowed: ['agent', 'admin', 'superAdmin'],
    description: 'A reopened ticket was abandoned.',
  },

  // --- cancellation ---
  {
    from: TicketStatus.ASSIGNED,
    to: TicketStatus.CANCELLED,
    allowed: ['agent', 'admin', 'superAdmin'],
    description: 'The ticket was cancelled before work began.',
  },
  {
    from: TicketStatus.IN_PROGRESS,
    to: TicketStatus.CANCELLED,
    allowed: ['agent', 'admin', 'superAdmin'],
    description: 'The ticket was cancelled during work.',
  },
  {
    from: TicketStatus.WAITING_FOR_CLIENT,
    to: TicketStatus.CANCELLED,
    allowed: ['requester', 'agent', 'admin', 'superAdmin'],
    description: 'The requester withdrew the ticket.',
  },
  {
    from: TicketStatus.WAITING_FOR_EMPLOYEE,
    to: TicketStatus.CANCELLED,
    allowed: ['agent', 'admin', 'superAdmin'],
    description: 'The ticket was abandoned.',
  },
];

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: TicketStatus,
    readonly to: TicketStatus,
    message: string,
  ) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Returns the rules that leave `from`.
 */
export function transitionsFrom(from: TicketStatus): TransitionRule[] {
  return TICKET_TRANSITIONS.filter((rule) => rule.from === from);
}

/**
 * Validates a transition against the state machine and the caller's
 * capabilities. Throws {@link InvalidTransitionError} with a specific message
 * when the move is not legal, so the API can distinguish "impossible" (409)
 * from "not allowed for you" (403).
 */
export function assertTransition(
  from: TicketStatus,
  to: TicketStatus,
  capabilities: readonly TicketCapability[],
  type: TicketType,
): TransitionRule {
  const rule = TICKET_TRANSITIONS.find(
    (candidate) => candidate.from === from && candidate.to === to,
  );

  if (!rule) {
    throw new InvalidTransitionError(
      from,
      to,
      `A ticket cannot move from ${from} to ${to}. Allowed next states: ${
        transitionsFrom(from)
          .map((candidate) => candidate.to)
          .join(', ') || 'none'
      }.`,
    );
  }

  if (rule.types && !rule.types.includes(type)) {
    throw new InvalidTransitionError(
      from,
      to,
      `The ${from} -> ${to} transition only applies to ${rule.types.join(', ')} tickets.`,
    );
  }

  const permitted = rule.allowed.some((capability) =>
    capabilities.includes(capability),
  );
  if (!permitted) {
    throw new InvalidTransitionError(
      from,
      to,
      `Your role cannot perform ${from} -> ${to}. This step requires: ${rule.allowed.join(' or ')}.`,
    );
  }

  return rule;
}

/**
 * CLIENT_SUPPORT tickets normally require the client to accept the resolution
 * before the ticket can be closed. Agents and employees therefore cannot close
 * them; only the requester, or an admin/super-admin using the explicit override
 * path (which forces a reason, writes an audit record and notifies the client).
 */
export function requiresClientConfirmation(
  status: TicketStatus,
  type: TicketType,
): boolean {
  return type === TicketType.CLIENT_SUPPORT && status === TicketStatus.RESOLVED;
}

/** Statuses that are finished and should not be scanned by background jobs. */
export const TERMINAL_STATUSES: readonly TicketStatus[] = [
  TicketStatus.CLOSED,
  TicketStatus.CANCELLED,
];

/** Statuses where the requester is expected to act next. */
export const AWAITING_REQUESTER: readonly TicketStatus[] = [
  TicketStatus.WAITING_FOR_CLIENT,
];
