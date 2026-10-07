import { SlaEngineService, SlaTicketState } from './sla-engine.service';
import { TicketStatus } from '@prisma/client';
import { Tx } from '../../../common/prisma/unit-of-work.service';

const MIN = 60_000;

type FakeTicket = {
  id: string;
  slaPausedAt: Date | null;
  slaPausedReason: string | null;
  totalPausedDurationMs: bigint;
  resolutionDeadline: Date | null;
  firstResponseDeadline: Date | null;
  firstRespondedAt: Date | null;
};

/**
 * A stateful stand-in for the transaction client. The engine's
 * pause/resume methods read, then conditionally write, ticket rows,
 * so the fake has to remember state across calls — including the
 * `where`-clause guards that make pause idempotent.
 */
function createFakeTx(initial: Partial<FakeTicket> = {}) {
  const state: FakeTicket = {
    id: 'ticket-1',
    slaPausedAt: null,
    slaPausedReason: null,
    totalPausedDurationMs: 0n,
    resolutionDeadline: null,
    firstResponseDeadline: null,
    firstRespondedAt: null,
    ...initial,
  };

  const writes: Array<{ op: string; where: unknown; data: unknown }> = [];

  const whereMatches = (where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([key, expected]) => {
      const actual = (state as unknown as Record<string, unknown>)[key];
      if (expected === null) return actual === null;
      return actual === expected;
    });

  const pick = (select?: Record<string, boolean>) => {
    if (!select) return { ...state };
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(select)) {
      out[key] = (state as unknown as Record<string, unknown>)[key];
    }
    return out;
  };

  const tx = {
    ticket: {
      findUnique: async (args: {
        where: { id: string };
        select?: Record<string, boolean>;
      }) => (args.where.id === state.id ? pick(args.select) : null),
      update: async (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        writes.push({ op: 'update', where: args.where, data: args.data });
        Object.assign(state, args.data);
        return { ...state };
      },
      updateMany: async (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        if (args.where.id !== undefined && args.where.id !== state.id) {
          return { count: 0 };
        }
        if (!whereMatches(args.where)) {
          return { count: 0 };
        }
        writes.push({ op: 'updateMany', where: args.where, data: args.data });
        Object.assign(state, args.data);
        return { count: 1 };
      },
    },
  };

  return { tx: tx as unknown as Tx, state, writes };
}

const POLICY = { responseTimeMins: 30, resolutionTimeMins: 120 };

describe('SlaEngineService', () => {
  let engine: SlaEngineService;

  beforeEach(() => {
    engine = new SlaEngineService();
  });

  describe('computeDeadlines', () => {
    it('returns null deadlines when no policy applies', () => {
      const from = new Date('2026-01-01T00:00:00Z');
      expect(engine.computeDeadlines(null, from)).toEqual({
        firstResponseDeadline: null,
        resolutionDeadline: null,
      });
    });

    it('offsets both clocks from the same instant', () => {
      const from = new Date('2026-01-01T00:00:00Z');
      const deadlines = engine.computeDeadlines(POLICY, from);
      expect(deadlines.firstResponseDeadline).toEqual(
        new Date(from.getTime() + 30 * MIN),
      );
      expect(deadlines.resolutionDeadline).toEqual(
        new Date(from.getTime() + 120 * MIN),
      );
    });
  });

  describe('clock state classification', () => {
    it('pauses only while waiting on someone else', () => {
      expect(engine.shouldPause(TicketStatus.WAITING_FOR_CLIENT)).toBe(true);
      expect(engine.shouldPause(TicketStatus.WAITING_FOR_EMPLOYEE)).toBe(true);
      for (const status of [
        TicketStatus.OPEN,
        TicketStatus.ASSIGNED,
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLUTION_SUBMITTED,
        TicketStatus.UNDER_VERIFICATION,
        TicketStatus.REOPENED,
      ]) {
        expect(engine.shouldPause(status)).toBe(false);
      }
    });

    it('stops the resolution clock on terminal outcomes', () => {
      for (const status of [
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
        TicketStatus.CANCELLED,
      ]) {
        expect(engine.isResolutionClockStopped(status)).toBe(true);
      }
      expect(engine.isResolutionClockStopped(TicketStatus.OPEN)).toBe(false);
    });
  });

  describe('pause', () => {
    it('records the pause instant and reason', async () => {
      const { tx, state } = createFakeTx();
      const pausedAt = new Date('2026-01-01T00:10:00Z');

      await engine.pause(tx, 'ticket-1', 'status:WAITING_FOR_CLIENT', pausedAt);

      expect(state.slaPausedAt).toEqual(pausedAt);
      expect(state.slaPausedReason).toBe('status:WAITING_FOR_CLIENT');
    });

    it('is idempotent — a second pause cannot reset the window', async () => {
      const first = new Date('2026-01-01T00:10:00Z');
      const { tx, state, writes } = createFakeTx({
        slaPausedAt: first,
      });

      // The conditional update (`slaPausedAt: null` in the where
      // clause) matches nothing, so the original instant survives.
      await engine.pause(
        tx,
        'ticket-1',
        'again',
        new Date('2026-01-01T00:20:00Z'),
      );

      expect(state.slaPausedAt).toEqual(first);
      expect(writes.filter((w) => w.op === 'updateMany').length).toBe(0);
    });
  });

  describe('resume — the fold-exactly-once invariant', () => {
    it('folds the window into the totals and extends both deadlines', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const { tx, state } = createFakeTx({
        slaPausedAt: new Date(t0.getTime() + 10 * MIN),
        totalPausedDurationMs: 0n,
        resolutionDeadline: new Date(t0.getTime() + 120 * MIN),
        firstResponseDeadline: new Date(t0.getTime() + 30 * MIN),
      });

      const elapsed = await engine.resume(
        tx,
        'ticket-1',
        new Date(t0.getTime() + 20 * MIN),
      );

      expect(elapsed).toBe(10 * MIN);
      expect(state.totalPausedDurationMs).toBe(BigInt(10 * MIN));
      expect(state.resolutionDeadline).toEqual(
        new Date(t0.getTime() + 130 * MIN),
      );
      expect(state.firstResponseDeadline).toEqual(
        new Date(t0.getTime() + 40 * MIN),
      );
      expect(state.slaPausedAt).toBeNull();
      expect(state.slaPausedReason).toBeNull();
    });

    it('returns null and writes nothing when not paused', async () => {
      const { tx, state, writes } = createFakeTx();

      const elapsed = await engine.resume(tx, 'ticket-1');

      expect(elapsed).toBeNull();
      expect(writes).toEqual([]);
      expect(state.totalPausedDurationMs).toBe(0n);
    });

    it('does not extend the response deadline after the first response', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const respondedAt = new Date(t0.getTime() + 5 * MIN);
      const { tx, state } = createFakeTx({
        slaPausedAt: new Date(t0.getTime() + 10 * MIN),
        firstRespondedAt: respondedAt,
        firstResponseDeadline: new Date(t0.getTime() + 30 * MIN),
        resolutionDeadline: new Date(t0.getTime() + 120 * MIN),
      });

      await engine.resume(tx, 'ticket-1', new Date(t0.getTime() + 20 * MIN));

      // The response SLA outcome is already a fact: only the
      // resolution clock may be extended.
      expect(state.firstResponseDeadline).toEqual(
        new Date(t0.getTime() + 30 * MIN),
      );
      expect(state.resolutionDeadline).toEqual(
        new Date(t0.getTime() + 130 * MIN),
      );
    });

    it('clamps a clock that moved backwards to zero elapsed', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const { tx, state } = createFakeTx({
        slaPausedAt: new Date(t0.getTime() + 20 * MIN),
        totalPausedDurationMs: BigInt(5 * MIN),
        resolutionDeadline: new Date(t0.getTime() + 120 * MIN),
      });

      // "Now" is before the pause instant (NTP correction).
      const elapsed = await engine.resume(
        tx,
        'ticket-1',
        new Date(t0.getTime() + 10 * MIN),
      );

      expect(elapsed).toBe(0);
      expect(state.totalPausedDurationMs).toBe(BigInt(5 * MIN));
      expect(state.resolutionDeadline).toEqual(
        new Date(t0.getTime() + 120 * MIN),
      );
      expect(state.slaPausedAt).toBeNull();
    });

    it('repeated cycles accumulate and are never double-counted', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const { tx, state } = createFakeTx({
        resolutionDeadline: new Date(t0.getTime() + 120 * MIN),
        firstResponseDeadline: new Date(t0.getTime() + 30 * MIN),
      });

      // Cycle 1: pause 10 -> 20 (10 min)
      await engine.pause(
        tx,
        'ticket-1',
        'w1',
        new Date(t0.getTime() + 10 * MIN),
      );
      await engine.resume(tx, 'ticket-1', new Date(t0.getTime() + 20 * MIN));

      // Cycle 2: pause 30 -> 45 (15 min)
      await engine.pause(
        tx,
        'ticket-1',
        'w2',
        new Date(t0.getTime() + 30 * MIN),
      );
      await engine.resume(tx, 'ticket-1', new Date(t0.getTime() + 45 * MIN));

      // Total paused = 25 min; the deadline moved by exactly 25 min.
      expect(state.totalPausedDurationMs).toBe(BigInt(25 * MIN));
      expect(state.resolutionDeadline).toEqual(
        new Date(t0.getTime() + 145 * MIN),
      );
      expect(state.firstResponseDeadline).toEqual(
        new Date(t0.getTime() + 55 * MIN),
      );
      expect(state.slaPausedAt).toBeNull();
    });
  });

  describe('syncPauseStateForStatus', () => {
    it('pauses on a waiting status', async () => {
      const { tx, state } = createFakeTx();
      const now = new Date('2026-01-01T00:05:00Z');

      await engine.syncPauseStateForStatus(
        tx,
        'ticket-1',
        TicketStatus.WAITING_FOR_CLIENT,
        now,
      );

      expect(state.slaPausedAt).toEqual(now);
    });

    it('resumes on an active status', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const { tx, state } = createFakeTx({
        slaPausedAt: new Date(t0.getTime() + 10 * MIN),
        resolutionDeadline: new Date(t0.getTime() + 120 * MIN),
      });

      await engine.syncPauseStateForStatus(
        tx,
        'ticket-1',
        TicketStatus.IN_PROGRESS,
        new Date(t0.getTime() + 20 * MIN),
      );

      expect(state.slaPausedAt).toBeNull();
      expect(state.totalPausedDurationMs).toBe(BigInt(10 * MIN));
      expect(state.resolutionDeadline).toEqual(
        new Date(t0.getTime() + 130 * MIN),
      );
    });

    it('folds the open window on a terminal status, then stops the clock', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const { tx, state } = createFakeTx({
        slaPausedAt: new Date(t0.getTime() + 10 * MIN),
        resolutionDeadline: new Date(t0.getTime() + 120 * MIN),
      });

      await engine.syncPauseStateForStatus(
        tx,
        'ticket-1',
        TicketStatus.RESOLVED,
        new Date(t0.getTime() + 20 * MIN),
      );

      expect(state.slaPausedAt).toBeNull();
      expect(state.totalPausedDurationMs).toBe(BigInt(10 * MIN));
      expect(state.resolutionDeadline).toEqual(
        new Date(t0.getTime() + 130 * MIN),
      );
    });
  });

  describe('elapsedActiveMs', () => {
    it('excludes folded windows and the open window inside the range', () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const state: SlaTicketState = {
        id: 'ticket-1',
        status: TicketStatus.IN_PROGRESS,
        firstResponseDeadline: null,
        firstRespondedAt: null,
        resolutionDeadline: null,
        resolvedAt: null,
        slaPausedAt: new Date(t0.getTime() + 90 * MIN),
        slaPausedReason: 'status:WAITING_FOR_CLIENT',
        totalPausedDurationMs: BigInt(10 * MIN),
        slaResponseBreachedAt: null,
        slaResolutionBreachedAt: null,
      };

      // 120 min raw, minus 10 folded, minus the 30 min of
      // open window (t0+90 -> t0+120) that falls inside
      // [t0, t0+120].
      const elapsed = engine.elapsedActiveMs(
        state,
        t0,
        new Date(t0.getTime() + 120 * MIN),
      );

      expect(elapsed).toBe(80 * MIN);
    });
  });

  describe('describe', () => {
    const base = {
      createdAt: new Date('2026-01-01T00:00:00Z'),
      firstResponseDeadline: null,
      firstRespondedAt: null,
      slaResponseBreachedAt: null,
      resolutionDeadline: null,
      resolvedAt: null,
      slaResolutionBreachedAt: null,
      slaPausedAt: null,
      totalPausedDurationMs: 0n,
    };

    it('reports none without a deadline', () => {
      expect(engine.describe(base, new Date('2026-01-01T01:00:00Z'))).toEqual({
        response: 'none',
        resolution: 'none',
        paused: false,
      });
    });

    it('classifies a recorded breach as final', () => {
      const ticket = {
        ...base,
        resolutionDeadline: new Date('2026-01-01T02:00:00Z'),
        slaResolutionBreachedAt: new Date('2026-01-01T02:30:00Z'),
      };
      // Even though "now" is well past the deadline, the breach
      // timestamp is the fact; it stays 'breached', not 'met'.
      expect(
        engine.describe(ticket, new Date('2026-01-01T03:00:00Z')).resolution,
      ).toBe('breached');
    });

    it('compares a stopped clock against its stop instant', () => {
      const met = {
        ...base,
        resolutionDeadline: new Date('2026-01-01T02:00:00Z'),
        resolvedAt: new Date('2026-01-01T01:00:00Z'),
      };
      expect(
        engine.describe(met, new Date('2026-01-01T03:00:00Z')).resolution,
      ).toBe('met');

      const late = {
        ...base,
        resolutionDeadline: new Date('2026-01-01T01:00:00Z'),
        resolvedAt: new Date('2026-01-01T02:00:00Z'),
      };
      expect(
        engine.describe(late, new Date('2026-01-01T03:00:00Z')).resolution,
      ).toBe('breached');
    });

    it('reports paused tickets as paused', () => {
      const ticket = {
        ...base,
        resolutionDeadline: new Date('2026-01-01T02:00:00Z'),
        slaPausedAt: new Date('2026-01-01T00:30:00Z'),
      };
      expect(
        engine.describe(ticket, new Date('2026-01-01T01:00:00Z')),
      ).toMatchObject({ resolution: 'paused', paused: true });
    });

    it('warns at 80% of ACTIVE time, not calendar time', () => {
      // 120-minute resolution window; 60 minutes were paused.
      // At t=100min the calendar remaining is 20min (16% of the
      // window) which would look like a warning on raw time — but
      // only 40 of 120 active minutes have elapsed, so the ticket
      // is still comfortably running.
      const ticket = {
        ...base,
        resolutionDeadline: new Date('2026-01-01T02:00:00Z'),
        totalPausedDurationMs: BigInt(60 * MIN),
      };
      expect(
        engine.describe(ticket, new Date('2026-01-01T01:40:00Z')).resolution,
      ).toBe('running');
    });

    it('warns once 80% of the active window has elapsed', () => {
      const ticket = {
        ...base,
        resolutionDeadline: new Date('2026-01-01T02:00:00Z'),
        totalPausedDurationMs: 0n,
      };
      // 100 of 120 active minutes = 83%.
      expect(
        engine.describe(ticket, new Date('2026-01-01T01:40:00Z')).resolution,
      ).toBe('warning');
    });

    it('reports a breach once active time exceeds the active window', () => {
      const ticket = {
        ...base,
        resolutionDeadline: new Date('2026-01-01T02:00:00Z'),
        // 30 folded minutes: the active window is 90 minutes.
        totalPausedDurationMs: BigInt(30 * MIN),
      };
      // 100 active minutes elapsed > 90-minute active window.
      expect(
        engine.describe(ticket, new Date('2026-01-01T02:10:00Z')).resolution,
      ).toBe('breached');
    });
  });
});
