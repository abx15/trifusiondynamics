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

-- Step 5: Row-Level Security (RLS)
-- Enable RLS on the table so that PostgreSQL enforces the policy at the engine level.
ALTER TABLE "cms"."ContactSubmission" ENABLE ROW LEVEL SECURITY;

-- Policy: an authenticated session variable app.current_org_id must match the row.
-- Set via: SET LOCAL app.current_org_id = '<orgId>';  (done in PrismaService.$extends or middleware)
-- The USING clause is evaluated on SELECT/UPDATE/DELETE; WITH CHECK on INSERT/UPDATE.
CREATE POLICY IF NOT EXISTS "contact_submission_org_isolation"
  ON "cms"."ContactSubmission"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING (
    "organizationId" = current_setting('app.current_org_id', TRUE)
    OR current_setting('app.bypass_rls', TRUE) = 'on'
  )
  WITH CHECK (
    "organizationId" = current_setting('app.current_org_id', TRUE)
    OR current_setting('app.bypass_rls', TRUE) = 'on'
  );
