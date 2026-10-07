import {
  InvalidTransitionError,
  TERMINAL_STATUSES,
  TICKET_TRANSITIONS,
  assertTransition,
  requiresClientConfirmation,
  transitionsFrom,
} from './ticket-state-machine';
import { TicketStatus, TicketType } from '@prisma/client';

const ALL = ['requester', 'assignee', 'agent', 'admin', 'superAdmin'] as const;

describe('ticket state machine', () => {
  describe('transitionsFrom', () => {
    it('lists every rule leaving a status', () => {
      const fromOpen = transitionsFrom(TicketStatus.OPEN);
      expect(fromOpen.map((rule) => rule.to)).toEqual(
        expect.arrayContaining([
          TicketStatus.ASSIGNED,
          TicketStatus.IN_PROGRESS,
          TicketStatus.CANCELLED,
        ]),
      );
    });

    it('returns an empty list for a state with no outgoing rules', () => {
      expect(transitionsFrom(TicketStatus.CLOSED)).toEqual([]);
      expect(transitionsFrom(TicketStatus.CANCELLED)).toEqual([]);
    });

    it('every declared rule has a unique from/to pair', () => {
      const seen = new Set<string>();
      for (const rule of TICKET_TRANSITIONS) {
        const key = `${rule.from}->${rule.to}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
  });

  describe('assertTransition', () => {
    it('accepts a legal transition for a capable actor', () => {
      const rule = assertTransition(
        TicketStatus.OPEN,
        TicketStatus.ASSIGNED,
        ['agent'],
        TicketType.INTERNAL,
      );
      expect(rule.allowed).toContain('agent');
    });

    it('accepts a transition for a super admin', () => {
      expect(() =>
        assertTransition(
          TicketStatus.RESOLVED,
          TicketStatus.CLOSED,
          ['superAdmin'],
          TicketType.CLIENT_SUPPORT,
        ),
      ).not.toThrow();
    });

    it('rejects a transition that does not exist', () => {
      expect(() =>
        assertTransition(
          TicketStatus.CLOSED,
          TicketStatus.OPEN,
          ALL,
          TicketType.INTERNAL,
        ),
      ).toThrow(InvalidTransitionError);
    });

    it('reports the allowed next states when a move is impossible', () => {
      try {
        assertTransition(
          TicketStatus.UNDER_VERIFICATION,
          TicketStatus.CANCELLED,
          ALL,
          TicketType.INTERNAL,
        );
        fail('expected InvalidTransitionError');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidTransitionError);
        const message = (error as InvalidTransitionError).message;
        // The message must enumerate the real options for this state.
        expect(message).toContain(TicketStatus.RESOLVED);
        expect(message).toContain(TicketStatus.IN_PROGRESS);
      }
    });

    it('rejects a move the actor has no capability for', () => {
      // Verification is agent/admin/superAdmin only — a bare
      // requester can never verify a resolution.
      expect(() =>
        assertTransition(
          TicketStatus.RESOLUTION_SUBMITTED,
          TicketStatus.UNDER_VERIFICATION,
          ['requester'],
          TicketType.INTERNAL,
        ),
      ).toThrow(/Your role cannot perform/);
    });

    it('rejects an assignee trying to verify their own resolution', () => {
      expect(() =>
        assertTransition(
          TicketStatus.RESOLUTION_SUBMITTED,
          TicketStatus.UNDER_VERIFICATION,
          ['assignee'],
          TicketType.INTERNAL,
        ),
      ).toThrow(/Your role cannot perform/);
    });

    it('allows the requester to reopen their own CLIENT_SUPPORT ticket', () => {
      expect(() =>
        assertTransition(
          TicketStatus.RESOLVED,
          TicketStatus.REOPENED,
          ['requester'],
          TicketType.CLIENT_SUPPORT,
        ),
      ).not.toThrow();
    });

    it('rejects reopening an INTERNAL ticket (type-restricted rule)', () => {
      expect(() =>
        assertTransition(
          TicketStatus.RESOLVED,
          TicketStatus.REOPENED,
          ALL,
          TicketType.INTERNAL,
        ),
      ).toThrow(/only applies to/);
    });

    it('requires the requester (or staff) to cancel from WAITING_FOR_CLIENT', () => {
      expect(() =>
        assertTransition(
          TicketStatus.WAITING_FOR_CLIENT,
          TicketStatus.CANCELLED,
          ['assignee'],
          TicketType.INTERNAL,
        ),
      ).toThrow(/Your role cannot perform/);
      expect(() =>
        assertTransition(
          TicketStatus.WAITING_FOR_CLIENT,
          TicketStatus.CANCELLED,
          ['requester'],
          TicketType.INTERNAL,
        ),
      ).not.toThrow();
    });

    it('rejects cancelling a terminal ticket', () => {
      for (const terminal of TERMINAL_STATUSES) {
        expect(() =>
          assertTransition(
            terminal,
            TicketStatus.OPEN,
            ALL,
            TicketType.INTERNAL,
          ),
        ).toThrow(InvalidTransitionError);
      }
    });
  });

  describe('requiresClientConfirmation', () => {
    it('is only true for RESOLVED CLIENT_SUPPORT tickets', () => {
      expect(
        requiresClientConfirmation(
          TicketStatus.RESOLVED,
          TicketType.CLIENT_SUPPORT,
        ),
      ).toBe(true);
      expect(
        requiresClientConfirmation(TicketStatus.RESOLVED, TicketType.INTERNAL),
      ).toBe(false);
      expect(
        requiresClientConfirmation(
          TicketStatus.IN_PROGRESS,
          TicketType.CLIENT_SUPPORT,
        ),
      ).toBe(false);
    });
  });
});
