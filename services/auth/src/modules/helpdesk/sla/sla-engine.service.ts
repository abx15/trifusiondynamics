import { Injectable, Logger } from '@nestjs/common';
import { SLAPolicy, Ticket, TicketStatus } from '@prisma/client';
import { Tx } from '../../../common/prisma/unit-of-work.service';

const MS_PER_MINUTE = 60_000;

/** Statuses during which the resolution clock must not advance. */
const PAUSING_STATUSES: readonly TicketStatus[] = [
  TicketStatus.WAITING_FOR_CLIENT,
  TicketStatus.WAITING_FOR_EMPLOYEE,
];

/** Statuses that are terminal with respect to the resolution clock. */
const RESOLUTION_CLOSED_STATUSES: readonly TicketStatus[] = [
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
  TicketStatus.CANCELLED,
];

export interface SlaDeadlines {
  firstResponseDeadline: Date | null;
  resolutionDeadline: Date | null;
}

/** Fields the engine needs; kept narrow so it can be unit tested with plain objects. */
export type SlaTicketState = Pick<
  Ticket,
  | 'id'
  | 'status'
  | 'firstResponseDeadline'
  | 'firstRespondedAt'
  | 'resolutionDeadline'
  | 'resolvedAt'
  | 'slaPausedAt'
  | 'slaPausedReason'
  | 'totalPausedDurationMs'
  | 'slaResponseBreachedAt'
  | 'slaResolutionBreachedAt'
>;

/**
 * SLA timing engine.
 *
 * Two independent clocks per ticket:
 *   - response clock:   starts at creation, stops at firstRespondedAt
 *   - resolution clock: starts at creation, stops at resolvedAt (or closedAt)
 *
 * PAUSE/RESUME INVARIANT
 * ----------------------
 * While `slaPausedAt IS NOT NULL`, the currently-open pause window has NOT been
 * folded into `totalPausedDurationMs` yet. Folding happens exactly once, on
 * resume:
 *
 *   pause()   -> slaPausedAt = now            (nothing else changes)
 *   resume()  -> elapsed = now - slaPausedAt
 *                totalPausedDurationMs += elapsed
 *                resolutionDeadline    += elapsed
 *                firstResponseDeadline += elapsed   (only if still unresponded)
 *                slaPausedAt = null; slaPausedReason = null
 *
 * Because `elapsed` is the length of THIS window only, repeated pause/resume
 * cycles accumulate correctly and the cumulative total is never added to the
 * deadline more than once.
 */
@Injectable()
export class SlaEngineService {
  private readonly logger = new Logger(SlaEngineService.name);

  /** Initial deadlines for a brand-new ticket. */
  computeDeadlines(
    policy: Pick<SLAPolicy, 'responseTimeMins' | 'resolutionTimeMins'> | null,
    from: Date = new Date(),
  ): SlaDeadlines {
    if (!policy) {
      return { firstResponseDeadline: null, resolutionDeadline: null };
    }
    return {
      firstResponseDeadline: new Date(
        from.getTime() + policy.responseTimeMins * MS_PER_MINUTE,
      ),
      resolutionDeadline: new Date(
        from.getTime() + policy.resolutionTimeMins * MS_PER_MINUTE,
      ),
    };
  }

  /**
   * Should the resolution clock be paused while the ticket sits in `status`?
   *
   * - WAITING_FOR_CLIENT: the ball is with the requester, so stop the clock.
   * - WAITING_FOR_EMPLOYEE: waiting on an internal dependency, so stop it too.
   * - Reopened: the ticket is active work again, so the clock runs again.
   */
  shouldPause(status: TicketStatus): boolean {
    return PAUSING_STATUSES.includes(status);
  }

  isResolutionClockStopped(status: TicketStatus): boolean {
    return RESOLUTION_CLOSED_STATUSES.includes(status);
  }

  /**
   * Enters the paused state. Deliberately idempotent: calling it twice does NOT
   * reset `slaPausedAt`, because doing so would silently discard the elapsed
   * portion of the first window.
   */
  async pause(
    tx: Tx,
    ticketId: string,
    reason: string,
    now: Date = new Date(),
  ): Promise<void> {
    await tx.ticket.updateMany({
      where: { id: ticketId, slaPausedAt: null },
      data: { slaPausedAt: now, slaPausedReason: reason },
    });
  }

  /**
   * Leaves the paused state, folding this window into the totals exactly once.
   *
   * A ticket whose response clock already stopped only has its resolution
   * deadline shifted: re-extending the response deadline after the first
   * response would misrepresent a met or missed response SLA.
   *
   * Already-recorded breach timestamps are never cleared — a breach is a
   * historical fact, not a value that can be paused away.
   */
  async resume(
    tx: Tx,
    ticketId: string,
    now: Date = new Date(),
  ): Promise<number | null> {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: {
        slaPausedAt: true,
        totalPausedDurationMs: true,
        resolutionDeadline: true,
        firstResponseDeadline: true,
        firstRespondedAt: true,
      },
    });

    if (!ticket?.slaPausedAt) {
      // Not paused — nothing to fold in.
      return null;
    }

    // Guard against a clock that moved backwards (NTP correction, data import).
    const elapsedMs = Math.max(0, now.getTime() - ticket.slaPausedAt.getTime());

    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        totalPausedDurationMs: ticket.totalPausedDurationMs + BigInt(elapsedMs),
        resolutionDeadline: ticket.resolutionDeadline
          ? new Date(ticket.resolutionDeadline.getTime() + elapsedMs)
          : null,
        firstResponseDeadline:
          !ticket.firstRespondedAt && ticket.firstResponseDeadline
            ? new Date(ticket.firstResponseDeadline.getTime() + elapsedMs)
            : ticket.firstResponseDeadline,
        slaPausedAt: null,
        slaPausedReason: null,
      },
    });

    return elapsedMs;
  }

  /**
   * Applies a status change to the pause state, resuming or pausing as needed.
   * Safe to call on every transition: both operations are idempotent.
   */
  async syncPauseStateForStatus(
    tx: Tx,
    ticketId: string,
    status: TicketStatus,
    now: Date = new Date(),
  ): Promise<void> {
    const isPausing = this.shouldPause(status);

    if (isPausing) {
      await this.pause(tx, ticketId, `status:${status}`, now);
      return;
    }

    // Terminal statuses freeze the resolution clock without recording a pause,
    // so only resume for statuses that are neither pausing nor terminal.
    if (this.isResolutionClockStopped(status)) {
      const current = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { slaPausedAt: true },
      });
      // Fold in the open window so totals stay consistent, then stop the clock.
      if (current?.slaPausedAt) {
        await this.resume(tx, ticketId, now);
      }
      return;
    }

    await this.resume(tx, ticketId, now);
  }

  /**
   * Milliseconds of un-paused time between two instants, excluding every pause
   * window that overlaps that interval.
   *
   * Used for analytics so "time to resolve" excludes periods where the ticket
   * was legitimately waiting on someone else.
   */
  elapsedActiveMs(state: SlaTicketState, from: Date, to: Date): number {
    const raw = Math.max(0, to.getTime() - from.getTime());
    let paused = Number(state.totalPausedDurationMs);

    if (state.slaPausedAt) {
      // Only the portion of the open window that falls inside [from, to].
      const windowStart = Math.max(state.slaPausedAt.getTime(), from.getTime());
      paused += Math.max(0, to.getTime() - windowStart);
    }

    return Math.max(0, raw - paused);
  }

  /**
   * Computes the instant at which a warning should fire for a window that
   * started at `windowStart` and ends at `deadline`.
   */
  warningInstant(windowStart: Date, deadline: Date, percent: number): Date {
    const start = windowStart.getTime();
    const end = deadline.getTime();
    return new Date(start + (end - start) * (percent / 100));
  }

  /**
   * Human-readable SLA state used by the UI and by notifications.
   *
   * `createdAt` is required because "how close are we to the deadline" is only
   * meaningful relative to the start of the window. Warning/breach
   * classification uses ACTIVE time (excluding folded pause windows), the
   * same measure the monitor uses, so the UI never disagrees with the
   * events the monitor emits.
   */
  describe(
    ticket: Pick<
      Ticket,
      | 'createdAt'
      | 'firstResponseDeadline'
      | 'firstRespondedAt'
      | 'slaResponseBreachedAt'
      | 'resolutionDeadline'
      | 'resolvedAt'
      | 'slaResolutionBreachedAt'
      | 'slaPausedAt'
      | 'totalPausedDurationMs'
    >,
    now: Date = new Date(),
  ): {
    response: 'met' | 'breached' | 'warning' | 'paused' | 'running' | 'none';
    resolution: 'met' | 'breached' | 'warning' | 'paused' | 'running' | 'none';
    paused: boolean;
  } {
    const windowStart = ticket.createdAt.getTime();
    // Only folded windows count here: an open pause window means the
    // classify() below returns 'paused' before this value is read.
    const pausedMs = Number(ticket.totalPausedDurationMs);

    const classify = (
      deadline: Date | null,
      breachedAt: Date | null,
      stoppedAt: Date | null,
    ): 'met' | 'breached' | 'warning' | 'paused' | 'running' | 'none' => {
      if (!deadline) return 'none';
      // A recorded breach is final, even if the deadline was later extended by
      // a resume.
      if (breachedAt) return 'breached';
      // The clock has stopped: compare the deadline against the stop instant.
      if (stoppedAt) {
        return deadline.getTime() >= stoppedAt.getTime() ? 'met' : 'breached';
      }
      if (ticket.slaPausedAt) return 'paused';

      const totalWindow = deadline.getTime() - windowStart;
      // The deadline was extended by every folded pause, so the active
      // window is the original policy window.
      const activeWindow = Math.max(1, totalWindow - pausedMs);
      const activeElapsed = Math.max(0, now.getTime() - windowStart - pausedMs);
      if (activeElapsed >= activeWindow) return 'breached';
      if (activeElapsed / activeWindow >= 0.8) return 'warning';
      return 'running';
    };

    return {
      response: classify(
        ticket.firstResponseDeadline,
        ticket.slaResponseBreachedAt,
        ticket.firstRespondedAt,
      ),
      resolution: classify(
        ticket.resolutionDeadline,
        ticket.slaResolutionBreachedAt,
        ticket.resolvedAt,
      ),
      paused: ticket.slaPausedAt !== null,
    };
  }
}
