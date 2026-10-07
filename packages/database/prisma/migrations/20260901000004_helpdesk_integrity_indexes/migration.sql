-- =============================================================================
-- Helpdesk Integrity — additive, NON-DESTRUCTIVE migration
--
-- Adds partial unique indexes that Prisma schema language cannot express.
--
-- Safety properties of this file:
--   * Only CREATE INDEX (CONCURRENTLY would be ideal but we use plain CREATE
--     because migration 000003 already created the tables empty.
--   * Every index is IF NOT EXISTS so replaying is a no-op.
--   * No DROP, no DELETE, no ALTER TABLE that rewrites.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. One catch-all RoutingRule per organization (isDefault = true)
--
--    The service layer clears the incumbent inside the same transaction before
--    promoting a new rule; this index is the enforcer that catches any
--    catastrophic race.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "RoutingRule_organizationId_isDefault_key"
    ON "helpdesk"."RoutingRule" ("organizationId")
    WHERE "isDefault" = true;

-- -----------------------------------------------------------------------------
-- 2. One default SLAPolicy per organization
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "SLAPolicy_organizationId_isDefault_key"
    ON "helpdesk"."SLAPolicy" ("organizationId")
    WHERE "isDefault" = true;

-- -----------------------------------------------------------------------------
-- 3. TicketAssignment: exactly-one-active-PRIMARY per ticket
--
--    A ticket may carry many SUPPORTING assignments but never more than one
--    PRIMARY assignment that is still active (isActive=true). The state
--    machine flips the old row to isActive=false before inserting the
--    new PRIMARY row; this partial index guarantees two PRIMARYs cannot both be
--    live, even if two writers race.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "TicketAssignment_oneActivePrimary_perTicket"
    ON "helpdesk"."TicketAssignment" ("ticketId")
    WHERE "type" = 'PRIMARY' AND "isActive" = true;

-- -----------------------------------------------------------------------------
-- 4. TicketAssignment: one active employee cannot appear twice on the same ticket
--
--    An employee may be assigned, unassigned, then reassigned — which
--    produces three rows. But at any one moment they can only have one
--    active assignment row per ticket. The append-only history is preserved
--    (isActive=false rows are ignored by the WHERE clause).
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "TicketAssignment_oneActiveEmployee_perTicket"
    ON "helpdesk"."TicketAssignment" ("ticketId", "employeeId")
    WHERE "isActive" = true;
