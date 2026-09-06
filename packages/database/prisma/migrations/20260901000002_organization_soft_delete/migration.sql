-- AddColumn: isActive on Organization (soft-delete / archive pattern)
-- This is a non-destructive additive change. Existing rows default to true.
-- No data loss, fully reversible by dropping the column.
ALTER TABLE "auth"."Organization" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Change cascade to restrict on User.organizationId
-- Previously: ON DELETE CASCADE (deleting org wiped all users + refresh tokens + roles)
-- Now: ON DELETE RESTRICT (prevents accidental org deletion from cascading to users)
-- This protects business-critical auth data. The application uses soft-delete (isActive)
-- instead of hard-delete, so no CASCADE is needed.
-- Reversible: change RESTRICT back to CASCADE.
ALTER TABLE "auth"."User" DROP CONSTRAINT "User_organizationId_fkey";
ALTER TABLE "auth"."User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
