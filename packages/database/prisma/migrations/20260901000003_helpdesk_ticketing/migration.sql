-- =============================================================================
-- Enterprise Helpdesk / Ticketing — additive, NON-DESTRUCTIVE migration
--
-- Safety properties of this file:
--   * No DROP TABLE, no DROP COLUMN, no TRUNCATE, no DELETE of business data.
--   * The pre-existing free-text "hr"."Employee"."department" column is
--     RENAMED to "departmentLegacy" (data preserved byte-for-byte) instead of
--     being dropped, then backfilled into the new org-scoped Department table.
--   * New tables are created inside three new schemas.
--   * Referential-integrity pre-flight checks run BEFORE the Employee->User
--     foreign key is added, and abort with an actionable message rather than
--     failing halfway with a cryptic constraint violation.
--   * Two partial unique indexes enforce assignment invariants that a plain
--     UNIQUE constraint cannot express (Prisma cannot model partial indexes,
--     so they are declared here and are intentionally absent from schema.prisma).
-- =============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "helpdesk";
CREATE SCHEMA IF NOT EXISTS "audit";
CREATE SCHEMA IF NOT EXISTS "outbox";

-- CreateEnum
CREATE TYPE "helpdesk"."TicketType" AS ENUM ('CLIENT_SUPPORT', 'INTERNAL');
CREATE TYPE "helpdesk"."EscalationLevel" AS ENUM ('NONE', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "helpdesk"."EscalationTrigger" AS ENUM ('SLA_WARNING', 'SLA_BREACH', 'SLA_CRITICAL_BREACH', 'MANUAL', 'REOPENED', 'CRITICAL_PRIORITY', 'SECURITY', 'SYSTEM_CRITICAL');
CREATE TYPE "helpdesk"."TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'WAITING_FOR_EMPLOYEE', 'RESOLUTION_SUBMITTED', 'UNDER_VERIFICATION', 'REOPENED', 'RESOLVED', 'CLOSED', 'CANCELLED');
CREATE TYPE "helpdesk"."TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');
CREATE TYPE "helpdesk"."TicketCategory" AS ENUM ('TECHNICAL', 'BILLING', 'ACCOUNT', 'FEATURE_REQUEST', 'BUG_REPORT', 'SECURITY', 'PERFORMANCE', 'IT_SUPPORT', 'HR', 'PAYROLL', 'GENERAL');
CREATE TYPE "helpdesk"."TicketSource" AS ENUM ('CLIENT_PORTAL', 'EMAIL', 'API', 'INTERNAL', 'PHONE', 'SYSTEM');
CREATE TYPE "helpdesk"."AssignmentType" AS ENUM ('PRIMARY', 'SUPPORTING');
CREATE TYPE "outbox"."OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD');

-- AlterTable
-- RENAME (not drop+add) so every existing department string survives.
-- Indexes follow the column via ALTER INDEX ... RENAME, which keeps them
-- usable instead of dropping and rebuilding them.
ALTER TABLE "hr"."Employee" RENAME COLUMN "department" TO "departmentLegacy";
ALTER INDEX "hr"."Employee_department_idx" RENAME TO "Employee_departmentLegacy_idx";
ALTER INDEX "hr"."Employee_organizationId_status_department_idx" RENAME TO "Employee_organizationId_status_departmentLegacy_idx";
ALTER TABLE "hr"."Employee" ADD COLUMN "departmentId" TEXT;

-- CreateTable
CREATE TABLE "hr"."Department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHelpdesk" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "type" "helpdesk"."TicketType" NOT NULL DEFAULT 'CLIENT_SUPPORT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "helpdesk"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "helpdesk"."TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "helpdesk"."TicketCategory" NOT NULL DEFAULT 'TECHNICAL',
    "source" "helpdesk"."TicketSource" NOT NULL DEFAULT 'CLIENT_PORTAL',
    "organizationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterEmployeeId" TEXT,
    "requesterRoleSnapshot" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "departmentId" TEXT,
    "assignedAgentId" TEXT,
    "slaPolicyId" TEXT,
    "firstResponseDeadline" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "slaResponseWarnedAt" TIMESTAMP(3),
    "slaResponseBreachedAt" TIMESTAMP(3),
    "resolutionDeadline" TIMESTAMP(3),
    "slaResolutionWarnedAt" TIMESTAMP(3),
    "slaResolutionBreachedAt" TIMESTAMP(3),
    "slaPausedAt" TIMESTAMP(3),
    "slaPausedReason" TEXT,
    "totalPausedDurationMs" BIGINT NOT NULL DEFAULT 0,
    "resolution" TEXT,
    "resolutionSubmittedAt" TIMESTAMP(3),
    "resolutionSubmittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closeOverride" BOOLEAN NOT NULL DEFAULT false,
    "closeOverrideReason" TEXT,
    "clientConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "clientConfirmedAt" TIMESTAMP(3),
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "escalationLevel" "helpdesk"."EscalationLevel" NOT NULL DEFAULT 'NONE',
    "escalatedAt" TIMESTAMP(3),
    "escalatedById" TEXT,
    "escalationReason" TEXT,
    "escalationClearedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."TicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."TicketAssignment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "helpdesk"."AssignmentType" NOT NULL DEFAULT 'PRIMARY',
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "unassignedById" TEXT,
    "unassignReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TicketAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."TicketActivity" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."TicketEscalation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "level" "helpdesk"."EscalationLevel" NOT NULL,
    "trigger" "helpdesk"."EscalationTrigger" NOT NULL,
    "reason" TEXT NOT NULL,
    "escalatedById" TEXT,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "clearedById" TEXT,
    "notifiedAdmin" BOOLEAN NOT NULL DEFAULT false,
    "notifiedSuperAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TicketEscalation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."SLAPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "ticketType" "helpdesk"."TicketType" NOT NULL,
    "category" "helpdesk"."TicketCategory",
    "priority" "helpdesk"."TicketPriority" NOT NULL,
    "responseTimeMins" INTEGER NOT NULL,
    "resolutionTimeMins" INTEGER NOT NULL,
    "warningThresholdPercent" INTEGER NOT NULL DEFAULT 80,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "policyOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLAPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."RoutingRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticketType" "helpdesk"."TicketType",
    "category" "helpdesk"."TicketCategory",
    "priority" "helpdesk"."TicketPriority",
    "departmentId" TEXT,
    "defaultAgentId" TEXT,
    "autoAssignEmployeeId" TEXT,
    "slaPolicyId" TEXT,
    "ruleOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "helpdesk"."Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit"."AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AuditLog is append-only. Revoke UPDATE/DELETE from PUBLIC so an accidental
-- or compromised application role cannot rewrite history.
REVOKE UPDATE, DELETE ON "audit"."AuditLog" FROM PUBLIC;

CREATE TABLE "outbox"."OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox"."OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "organizationId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Department_organizationId_isActive_idx" ON "hr"."Department"("organizationId", "isActive");
CREATE UNIQUE INDEX "Department_organizationId_code_key" ON "hr"."Department"("organizationId", "code");
CREATE UNIQUE INDEX "Department_organizationId_name_key" ON "hr"."Department"("organizationId", "name");

CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "helpdesk"."Ticket"("ticketNumber");
CREATE INDEX "Ticket_organizationId_idx" ON "helpdesk"."Ticket"("organizationId");
CREATE INDEX "Ticket_clientId_idx" ON "helpdesk"."Ticket"("clientId");
CREATE INDEX "Ticket_projectId_idx" ON "helpdesk"."Ticket"("projectId");
CREATE INDEX "Ticket_departmentId_idx" ON "helpdesk"."Ticket"("departmentId");
CREATE INDEX "Ticket_status_idx" ON "helpdesk"."Ticket"("status");
CREATE INDEX "Ticket_priority_idx" ON "helpdesk"."Ticket"("priority");
CREATE INDEX "Ticket_type_idx" ON "helpdesk"."Ticket"("type");
CREATE INDEX "Ticket_category_idx" ON "helpdesk"."Ticket"("category");
CREATE INDEX "Ticket_assignedAgentId_idx" ON "helpdesk"."Ticket"("assignedAgentId");
CREATE INDEX "Ticket_requesterId_idx" ON "helpdesk"."Ticket"("requesterId");
CREATE INDEX "Ticket_requesterEmployeeId_idx" ON "helpdesk"."Ticket"("requesterEmployeeId");
CREATE INDEX "Ticket_firstResponseDeadline_idx" ON "helpdesk"."Ticket"("firstResponseDeadline");
CREATE INDEX "Ticket_resolutionDeadline_idx" ON "helpdesk"."Ticket"("resolutionDeadline");
CREATE INDEX "Ticket_organizationId_status_createdAt_idx" ON "helpdesk"."Ticket"("organizationId", "status", "createdAt");
CREATE INDEX "Ticket_organizationId_clientId_status_idx" ON "helpdesk"."Ticket"("organizationId", "clientId", "status");
CREATE INDEX "Ticket_organizationId_departmentId_status_idx" ON "helpdesk"."Ticket"("organizationId", "departmentId", "status");
CREATE INDEX "Ticket_organizationId_type_status_idx" ON "helpdesk"."Ticket"("organizationId", "type", "status");
CREATE INDEX "Ticket_resolutionDeadline_status_idx" ON "helpdesk"."Ticket"("resolutionDeadline", "status");
CREATE INDEX "Ticket_firstResponseDeadline_status_idx" ON "helpdesk"."Ticket"("firstResponseDeadline", "status");
CREATE INDEX "Ticket_organizationId_escalationLevel_idx" ON "helpdesk"."Ticket"("organizationId", "escalationLevel");

CREATE INDEX "TicketComment_ticketId_createdAt_idx" ON "helpdesk"."TicketComment"("ticketId", "createdAt");
CREATE INDEX "TicketComment_userId_idx" ON "helpdesk"."TicketComment"("userId");
CREATE INDEX "TicketAttachment_ticketId_idx" ON "helpdesk"."TicketAttachment"("ticketId");

CREATE INDEX "TicketAssignment_ticketId_assignedAt_idx" ON "helpdesk"."TicketAssignment"("ticketId", "assignedAt");
CREATE INDEX "TicketAssignment_employeeId_isActive_idx" ON "helpdesk"."TicketAssignment"("employeeId", "isActive");
CREATE INDEX "TicketAssignment_ticketId_isActive_idx" ON "helpdesk"."TicketAssignment"("ticketId", "isActive");
CREATE INDEX "TicketAssignment_employeeId_assignedAt_idx" ON "helpdesk"."TicketAssignment"("employeeId", "assignedAt");

-- Assignment invariants. A plain UNIQUE(ticketId, employeeId) would forbid a
-- legitimate "A -> unassigned -> B -> A again" history, so uniqueness is scoped
-- to ACTIVE rows only via partial indexes:
--   1) at most one active PRIMARY assignee per ticket
--   2) at most one active row per (ticket, employee), so an employee cannot be
--      double-booked on the same ticket as both PRIMARY and SUPPORTING
CREATE UNIQUE INDEX "TicketAssignment_one_active_primary_per_ticket"
    ON "helpdesk"."TicketAssignment" ("ticketId")
    WHERE "isActive" = true AND "type" = 'PRIMARY';

CREATE UNIQUE INDEX "TicketAssignment_one_active_row_per_employee"
    ON "helpdesk"."TicketAssignment" ("ticketId", "employeeId")
    WHERE "isActive" = true;

CREATE INDEX "TicketActivity_ticketId_createdAt_idx" ON "helpdesk"."TicketActivity"("ticketId", "createdAt");
CREATE INDEX "TicketActivity_userId_idx" ON "helpdesk"."TicketActivity"("userId");
CREATE INDEX "TicketActivity_action_idx" ON "helpdesk"."TicketActivity"("action");

CREATE INDEX "TicketEscalation_ticketId_escalatedAt_idx" ON "helpdesk"."TicketEscalation"("ticketId", "escalatedAt");
CREATE INDEX "TicketEscalation_level_clearedAt_idx" ON "helpdesk"."TicketEscalation"("level", "clearedAt");
CREATE INDEX "TicketEscalation_trigger_idx" ON "helpdesk"."TicketEscalation"("trigger");

CREATE INDEX "SLAPolicy_organizationId_isActive_idx" ON "helpdesk"."SLAPolicy"("organizationId", "isActive");
CREATE INDEX "SLAPolicy_organizationId_ticketType_priority_idx" ON "helpdesk"."SLAPolicy"("organizationId", "ticketType", "priority");
CREATE INDEX "SLAPolicy_departmentId_idx" ON "helpdesk"."SLAPolicy"("departmentId");
CREATE UNIQUE INDEX "SLAPolicy_organizationId_name_key" ON "helpdesk"."SLAPolicy"("organizationId", "name");

CREATE INDEX "RoutingRule_organizationId_isActive_ruleOrder_idx" ON "helpdesk"."RoutingRule"("organizationId", "isActive", "ruleOrder");
CREATE INDEX "RoutingRule_organizationId_ticketType_category_priority_idx" ON "helpdesk"."RoutingRule"("organizationId", "ticketType", "category", "priority");
CREATE INDEX "RoutingRule_departmentId_idx" ON "helpdesk"."RoutingRule"("departmentId");
CREATE UNIQUE INDEX "RoutingRule_organizationId_name_key" ON "helpdesk"."RoutingRule"("organizationId", "name");
-- At most one catch-all rule per organization.
CREATE UNIQUE INDEX "RoutingRule_one_default_per_org"
    ON "helpdesk"."RoutingRule" ("organizationId")
    WHERE "isDefault" = true;

CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "helpdesk"."Notification"("userId", "isRead", "createdAt");
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "helpdesk"."Notification"("organizationId", "createdAt");
CREATE INDEX "Notification_type_idx" ON "helpdesk"."Notification"("type");
CREATE INDEX "Notification_entityType_entityId_idx" ON "helpdesk"."Notification"("entityType", "entityId");
-- NULL dedupeKey rows are not constrained by this index (Postgres default),
-- so only explicitly-keyed notifications are de-duplicated.
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "helpdesk"."Notification"("userId", "dedupeKey");

CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "audit"."AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "audit"."AuditLog"("actorId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "audit"."AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_idx" ON "audit"."AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "audit"."AuditLog"("createdAt");

CREATE INDEX "OutboxEvent_status_nextAttemptAt_idx" ON "outbox"."OutboxEvent"("status", "nextAttemptAt");
CREATE INDEX "OutboxEvent_organizationId_createdAt_idx" ON "outbox"."OutboxEvent"("organizationId", "createdAt");
CREATE INDEX "OutboxEvent_eventType_createdAt_idx" ON "outbox"."OutboxEvent"("eventType", "createdAt");
CREATE UNIQUE INDEX "OutboxEvent_eventType_idempotencyKey_key" ON "outbox"."OutboxEvent"("eventType", "idempotencyKey");
-- Partial index matching the processor's claim query, which only ever looks at
-- rows that are still claimable.
CREATE INDEX "OutboxEvent_claimable_idx"
    ON "outbox"."OutboxEvent" ("nextAttemptAt", "id")
    WHERE "status" IN ('PENDING', 'FAILED');

CREATE INDEX "Employee_departmentId_idx" ON "hr"."Employee"("departmentId");
CREATE INDEX "Employee_organizationId_status_departmentId_idx" ON "hr"."Employee"("organizationId", "status", "departmentId");

-- Referential-integrity pre-flight ------------------------------------------------
-- "hr"."Employee"."userId" had no FK to "auth"."User" before this migration.
-- Adding the FK is correct, but it must not fail opaquely halfway through.
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM "hr"."Employee" e
    LEFT JOIN "auth"."User" u ON u."id" = e."userId"
    WHERE u."id" IS NULL;

    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'Cannot add hr.Employee_userId_fkey: % employee row(s) reference a userId that does not exist in auth."User". Fix the orphaned rows first (they are listed in the DETAIL payload).',
            orphan_count
            USING DETAIL = (
                SELECT string_agg(format('employeeId=%s userId=%s', e."id", e."userId"), ', ')
                FROM "hr"."Employee" e
                LEFT JOIN "auth"."User" u ON u."id" = e."userId"
                WHERE u."id" IS NULL
            );
    END IF;
END $$;

-- AddForeignKey
ALTER TABLE "hr"."Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hr"."Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hr"."Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_requesterEmployeeId_fkey" FOREIGN KEY ("requesterEmployeeId") REFERENCES "hr"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "helpdesk"."SLAPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_escalatedById_fkey" FOREIGN KEY ("escalatedById") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Ticket" ADD CONSTRAINT "Ticket_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "helpdesk"."TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "helpdesk"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketComment" ADD CONSTRAINT "TicketComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "helpdesk"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketAttachment" ADD CONSTRAINT "TicketAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "helpdesk"."TicketAssignment" ADD CONSTRAINT "TicketAssignment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "helpdesk"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketAssignment" ADD CONSTRAINT "TicketAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "hr"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketAssignment" ADD CONSTRAINT "TicketAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketAssignment" ADD CONSTRAINT "TicketAssignment_unassignedById_fkey" FOREIGN KEY ("unassignedById") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "helpdesk"."TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "helpdesk"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketActivity" ADD CONSTRAINT "TicketActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "helpdesk"."TicketEscalation" ADD CONSTRAINT "TicketEscalation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "helpdesk"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketEscalation" ADD CONSTRAINT "TicketEscalation_escalatedById_fkey" FOREIGN KEY ("escalatedById") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."TicketEscalation" ADD CONSTRAINT "TicketEscalation_clearedById_fkey" FOREIGN KEY ("clearedById") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "helpdesk"."SLAPolicy" ADD CONSTRAINT "SLAPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."SLAPolicy" ADD CONSTRAINT "SLAPolicy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "helpdesk"."RoutingRule" ADD CONSTRAINT "RoutingRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."RoutingRule" ADD CONSTRAINT "RoutingRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."RoutingRule" ADD CONSTRAINT "RoutingRule_defaultAgentId_fkey" FOREIGN KEY ("defaultAgentId") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."RoutingRule" ADD CONSTRAINT "RoutingRule_autoAssignEmployeeId_fkey" FOREIGN KEY ("autoAssignEmployeeId") REFERENCES "hr"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."RoutingRule" ADD CONSTRAINT "RoutingRule_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "helpdesk"."SLAPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "helpdesk"."Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit"."AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data backfill: Department from the legacy free-text column -------------------
-- One Department row per distinct (organizationId, normalized legacy value).
-- Normalization is intentionally conservative: trim, collapse whitespace, drop
-- everything except letters/digits, and upper-case. departmentLegacy is left
-- untouched so the original text is always recoverable.
DO $$
BEGIN
    INSERT INTO "hr"."Department" ("id", "organizationId", "name", "code", "description", "isActive", "isHelpdesk", "createdAt", "updatedAt")
    SELECT
        md5(random()::text || clock_timestamp()::text || norm."organizationId" || norm.value)::uuid::text,
        norm."organizationId",
        initcap(norm.value)                                        AS name,
        upper(norm.value)                                          AS code,
        'Backfilled from the legacy free-text Employee.department column' AS description,
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM (
        SELECT DISTINCT
            "organizationId",
            regexp_replace(btrim(regexp_replace("departmentLegacy", '\s+', ' ', 'g')), '[^A-Za-z0-9]', '', 'g') AS value
        FROM "hr"."Employee"
        WHERE "departmentLegacy" IS NOT NULL
          AND btrim("departmentLegacy") <> ''
          AND regexp_replace(btrim("departmentLegacy"), '[^A-Za-z0-9]', '', 'g') <> ''
    ) AS norm
    ON CONFLICT DO NOTHING;
END $$;

-- Link employees to the department that matches their preserved legacy value.
-- Rows whose value cannot be matched are intentionally left with
-- departmentId = NULL and keep departmentLegacy for manual reconciliation; the
-- unresolved set is reported in the migration notes.
UPDATE "hr"."Employee" e
SET "departmentId" = d."id"
FROM "hr"."Department" d
WHERE e."departmentId" IS NULL
  AND e."departmentLegacy" IS NOT NULL
  AND btrim(e."departmentLegacy") <> ''
  AND d."organizationId" = e."organizationId"
  AND upper(d."code") = upper(regexp_replace(btrim(regexp_replace(e."departmentLegacy", '\s+', ' ', 'g')), '[^A-Za-z0-9]', '', 'g'));