-- Migration: 20261012000000_contact_submission_org_scope
-- Adds organizationId to ContactSubmission for multi-tenant security (RLS)

-- Step 1: Add organizationId column (nullable first to handle existing rows)
ALTER TABLE "cms"."ContactSubmission"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Step 2: Backfill existing rows with a sentinel/placeholder org
-- In production, replace with the real default org ID or run a targeted UPDATE.
UPDATE "cms"."ContactSubmission"
SET "organizationId" = 'legacy-unscoped'
WHERE "organizationId" IS NULL;

-- Step 3: Make the column NOT NULL once all rows are populated
ALTER TABLE "cms"."ContactSubmission"
  ALTER COLUMN "organizationId" SET NOT NULL;

-- Step 4: Indexes for org-filtered queries (P0 performance)
CREATE INDEX IF NOT EXISTS "ContactSubmission_organizationId_idx"
  ON "cms"."ContactSubmission"("organizationId");

CREATE INDEX IF NOT EXISTS "ContactSubmission_organizationId_status_idx"
  ON "cms"."ContactSubmission"("organizationId", "status");

-- RLS is intentionally not enabled here. Prisma's current request-context
-- middleware issues SET LOCAL outside the business query transaction, so the
-- setting is not guaranteed to apply on the same pooled connection. Enabling
-- RLS before transaction-scoped context propagation would deny legitimate
-- queries and create a false security boundary. All application queries must
-- remain explicitly organization-scoped until transaction-scoped RLS is added.
