/**
 * Deterministic matching helpers shared by routing rules and SLA policies.
 *
 * Both features answer "which configured row applies?" and both must produce
 * the same answer every time for the same inputs — no reliance on incidental
 * database row order.
 *
 * Specificity is a weighted sum of the criteria that are actually set:
 *
 *   ticketType   +8   (broadest discriminator, matches the documented
 *                       "Type" tier)
 *   category     +4
 *   priority     +2
 *   departmentId +1
 *
 * Ordering:
 *   1. higher specificity wins
 *   2. then higher explicit ruleOrder / policyOrder wins
 *   3. then the earlier createdAt wins
 *   4. then id, purely so the comparator is a total order
 *
 * The last two keys make the sort stable even when configuration rows were
 * created inside the same transaction with identical scores.
 */

export const SPECIFICITY_WEIGHTS = {
  ticketType: 8,
  category: 4,
  priority: 2,
  departmentId: 1,
} as const;

export interface MatchableCriteria {
  ticketType?: string | null;
  category?: string | null;
  priority?: string | null;
  departmentId?: string | null;
}

export function specificityScore(criteria: MatchableCriteria): number {
  return (
    (criteria.ticketType ? SPECIFICITY_WEIGHTS.ticketType : 0) +
    (criteria.category ? SPECIFICITY_WEIGHTS.category : 0) +
    (criteria.priority ? SPECIFICITY_WEIGHTS.priority : 0) +
    (criteria.departmentId ? SPECIFICITY_WEIGHTS.departmentId : 0)
  );
}

/**
 * A rule matches when every criterion it declares equals the ticket's value.
 * A null criterion means "any value", which is how catch-all rules are expressed.
 */
export function criteriaMatch(
  rule: MatchableCriteria,
  ticket: MatchableCriteria,
): boolean {
  if (rule.ticketType != null && rule.ticketType !== ticket.ticketType) {
    return false;
  }
  if (rule.category != null && rule.category !== ticket.category) {
    return false;
  }
  if (rule.priority != null && rule.priority !== ticket.priority) {
    return false;
  }
  if (rule.departmentId != null && rule.departmentId !== ticket.departmentId) {
    return false;
  }
  return true;
}

export interface SortableRule extends MatchableCriteria {
  createdAt: Date;
  id: string;
}

/**
 * Returns the best matching row, or null when nothing matches.
 *
 * `getOrder` supplies the explicit precedence field for the caller's table
 * (`ruleOrder` for RoutingRule, `policyOrder` for SLAPolicy), so the same
 * comparator serves both without forcing an unrelated column onto either model.
 */
export function pickMostSpecific<T extends SortableRule>(
  rules: readonly T[],
  ticket: MatchableCriteria,
  getOrder: (rule: T) => number,
): T | null {
  const matching = rules.filter((rule) => criteriaMatch(rule, ticket));
  if (matching.length === 0) return null;

  const sorted = [...matching].sort((a, b) => {
    const scoreDiff = specificityScore(b) - specificityScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    const orderDiff = getOrder(b) - getOrder(a);
    if (orderDiff !== 0) return orderDiff;

    const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (createdDiff !== 0) return createdDiff;

    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}
