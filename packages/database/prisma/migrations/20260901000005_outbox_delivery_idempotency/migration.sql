-- =============================================================================
-- Outbox processor — delivery idempotency
--
-- Adds the column that lets the outbox processor deliver webhook events
-- exactly once, even when a crash between "side effect executed" and
-- "row marked PROCESSED" causes the event to be re-claimed by the
-- stale-lock recovery.
--
-- Safety properties of this file:
--   * Purely additive: one nullable column, one partial unique index.
--   * No DROP, no data rewrite; existing rows keep outboxEventId = NULL
--     (legacy EventEmitter2-originated deliveries are unaffected).
--   * IF NOT EXISTS / IF EXISTS guards make replaying a no-op.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Reference back to the outbox event that produced a delivery.
--    Nullable: deliveries created by the legacy EventEmitter2 path
--    (invoice.paid, lead.created, ...) have no outbox event.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'developer'
          AND table_name = 'WebhookDelivery'
          AND column_name = 'outboxEventId'
    ) THEN
        ALTER TABLE "developer"."WebhookDelivery"
            ADD COLUMN "outboxEventId" TEXT;
    END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. At most one delivery per (webhook, outbox event). Partial index:
--    NULL outboxEventId rows are exempt, so legacy deliveries never
--    collide. The processor catches P2002 on insert and treats it as
--    "already delivered" — the redelivery is the duplicate, not an error.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookDelivery_webhookId_outboxEventId_key"
    ON "developer"."WebhookDelivery" ("webhookId", "outboxEventId")
    WHERE "outboxEventId" IS NOT NULL;
