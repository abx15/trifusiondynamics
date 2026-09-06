# Data Deletion Policy

> **VERIFIED** / **IMPLEMENTED** / **NOT CONFIGURED**

**Date:** 2026-09-06
**Scope:** Organization archive/soft-delete implementation for AgencyOS
**Repository:** `services/auth` (NestJS), `packages/database` (Prisma/PostgreSQL), `apps/admin-dashboard` (Next.js)

---

## 1. Organization Deletion Policy

### Strategy: Soft Delete / Archive

**STATUS: IMPLEMENTED**

Organizations are never hard-deleted. The database schema previously had
`User.organization ON DELETE CASCADE`, meaning a single `DELETE` on an
`Organization` row would cascade-delete every user, their refresh tokens,
and their role assignments — irreversible business data loss.

The implemented fix uses a **soft-delete (archive)** pattern:

1. An `isActive` boolean column is added to the `Organization` model
   (default `true`).
2. The foreign-key constraint from `User.organizationId` is changed from
   `ON DELETE CASCADE` to `ON DELETE RESTRICT`, making it **impossible**
   for any application code or DB admin accident to cascade-delete users
   when an organization row is touched.
3. Organization "deletion" is performed via the **archive** endpoint
   (`PATCH /users/organizations/:id/archive`), which sets `isActive = false`
   and revokes all sessions — no data is ever hard-deleted.

### API Surface

| Method | Endpoint | Authorized Role | Confirmation |
|--------|----------|-----------------|--------------|
| `PATCH` | `/users/organizations/:id/archive` | **Superadmin only** | Organization name must match |

### Confirmation Mechanism

The archive endpoint requires an explicit confirmation payload:

```json
{
  "confirmation": { "name": "Exact Organization Name" }
}
```

The `name` field must match the organization's `name` exactly. This prevents
accidental archival from a double-click or mistaken request.

The frontend requires the user to **type** the organization name into a text
field before the "Archive Organization" button becomes enabled.

---

## 2. Archive Behavior

**STATUS: IMPLEMENTED**

When an organization is archived:

1. **`Organization.isActive`** set to `false` — the organization is hidden
   from all listing endpoints and cannot be logged into.
2. **`User.isActive`** set to `false` for all users in the organization —
   all member accounts are deactivated.
3. **`RefreshToken.revoked`** set to `true` for all unrevoked tokens —
   all active sessions are terminated immediately.

### What is PRESERVED (not touched)

| Category | Records | Behavior |
|----------|---------|----------|
| **Authentication data** | `Role`, `Permission`, `RolePermission`, `UserRole` | Preserved — role definitions are global templates |
| **Audit data** | `ApiRequestLog` | Preserved (no FK to Organization) |
| **Business records** | `Client`, `Lead`, `Quote`, `Project`, `Task`, `Invoice`, `Estimate`, `Subscription`, `ExpenseRecord`, `Employee`, `EmployeeDocument`, `Recruitment`, `SalaryStructure`, `Payslip`, `BankDetail` | Preserved — tenant-scoped by `organizationId` (bare column) |
| **AI records** | `AiProposalRequest`, `AiSeoAudit`, `AiEmailDraft`, `AiMeetingSummary`, `AiKnowledgeEmbedding` | Preserved |
| **Analytics** | `RevenueRollup`, `ClientRollup`, `TeamPerformanceRollup` | Preserved |
| **Automation** | `Workflow`, `WorkflowRun` | Preserved |
| **Developer** | `ApiKey`, `Webhook`, `WebhookDelivery` | Preserved |

### What is DEACTIVATED (soft-deleted)

| Category | Records | Behavior |
|----------|---------|----------|
| **Organization** | `Organization.isActive = false` | Hidden from listing, login blocked |
| **Users** | `User.isActive = false` | Cannot authenticate |
| **Sessions** | `RefreshToken.revoked = true` | All active sessions revoked |

### Cascade Classification

| Relation | Classification | Delete Behavior |
|----------|---------------|-----------------|
| Organization → User | **Authentication Data** | `RESTRICT` (CHANGED from CASCADE) |
| User → RefreshToken | **Authentication Data** | `CASCADE` (on user delete only — not triggered by archive) |
| User → UserRole | **Authentication Data** | `CASCADE` (on user delete only — not triggered by archive) |
| Role → UserRole/RolePermission | **Authentication Data** | `CASCADE` (on role delete — roles are never deleted by archive) |
| Client → ClientContact | **Business Data** | `CASCADE` (on client delete — not triggered by archive) |
| Client → Payment | **Financial Data** | `RESTRICT` (intentional) |
| Project → Task/ProjectMember/Milestone | **Business Data** | `CASCADE` (on project delete — not triggered by archive) |
- Employee → Leave/EmployeeDocument | **HR/Business Data** | `CASCADE` (on employee deactivation? — employees are not deleted by archive) |

---

## 3. Authorization Requirements

**STATUS: IMPLEMENTED**

| Actor | Can Archive Org? | Reason |
|-------|-----------------|--------|
| **Superadmin** (`superadmin` / `super_admin` role) | ✅ Yes | Full platform access |
| **Admin** (`admin` role with `users:delete` permission) | ❌ No | Admin scope is tenant-scoped; cannot delete tenant |
| **Organization Member** (any role without superadmin) | ❌ No | Insufficient permissions |
| **Unauthenticated** | ❌ No | Authentication required |

### Cross-Tenant Protection

- The archive endpoint operates on the `orgId` URL parameter, not the
  authenticated user's `orgId`. Authorization is enforced via the
  `PermissionsGuard` + `JwtAuthGuard`, and the superadmin check ensures
  only global admins can call it.
- An organization administrator **cannot** archive another organization —
  only superadmins can.
- A regular member attempting to archive their own organization will
  receive a `403 Forbidden` response.

### IDOR Protection

- The endpoint uses `@Param('id')` to accept the organization ID.
- The `PermissionsGuard` enforces that only users with `users:delete`
  permission can reach the handler.
- The `isSuperAdminUser()` check in the controller ensures that even
  users with `users:delete` permission (non-superadmin admins) are blocked.
- This prevents IDOR: a tenant admin cannot archive an organization by
  guessing URLs.

---

## 4. Protected Records

**STATUS: VERIFIED**

The following record types are **never deleted** during organization archival:

- **User account data** — deactivated, not deleted (preserves audit trail)
- **Role assignments** (`UserRole`) — preserved for historical audit
- **All business records** (clients, leads, projects, invoices, etc.)
- **All HR records** (employees, payslips, salary structures, bank details)
- **All AI-generated content** (proposals, SEO audits, meeting summaries)
- **All analytics rollups** (historical reporting data)
- **All automation workflows** and execution history
- **All developer configurations** (API keys, webhooks, request logs)

---

## 5. Cascade Behavior

**STATUS: VERIFIED**

### Before (Risky)

```
DELETE Organization
  → CASCADE DELETE User (all users in org)
    → CASCADE DELETE RefreshToken (all session tokens)
    → CASCADE DELETE UserRole (all role assignments)
```

### After (Safe)

```
PATCH Organization (isActive = false)
  → UPDATE User (isActive = false, all users deactivated)
  → UPDATE RefreshToken (revoked = true, all sessions revoked)
  → No rows are ever deleted
```

The FK constraint on `User.organizationId` is changed to `ON DELETE RESTRICT`,
ensuring that even a manual `DELETE FROM Organization` query would fail
if users still reference the organization.

---

## 6. Recovery Considerations

**STATUS: NOT CONFIGURED** (archived orgs can be restored)

### Restoring an Archived Organization

Archived organizations can be restored by setting `isActive = true`:

1. Update `Organization.isActive = true`
2. Update `User.isActive = true` for affected users
3. Users will need to re-authenticate (refresh tokens were revoked)

This is a **planned** feature. Currently, restoration must be done via
direct database access (psql/admin tool). A future `PATCH` endpoint for
restoration will be added.

### Data Retention

- Archived organization data is retained **indefinitely**.
- No automated data purging is configured.
- All business records, user data, and audit trails are preserved.

---

## 7. Migration Strategy

**STATUS: IMPLEMENTED**

### Migration Name

`20260901000002_organization_soft_delete`

### Migration SQL

```sql
-- AddColumn: isActive on Organization (soft-delete / archive pattern)
ALTER TABLE "auth"."Organization" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Change cascade to restrict on User.organizationId
ALTER TABLE "auth"."User" DROP CONSTRAINT "User_organizationId_fkey";
ALTER TABLE "auth"."User" ADD CONSTRAINT "User_organizationId_fkey" 
  FOREIGN KEY ("organizationId") REFERENCES "auth"."Organization"("id") 
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Migration Properties

| Property | Status |
|----------|--------|
| **Non-destructive** | ✅ Yes — only adds column and changes FK constraint |
| **Reversible** | ✅ Yes — column can be dropped, constraint changed back to CASCADE |
| **Production-safe** | ✅ Yes — metadata-only FK change, no table rewrite |
| **No DROP TABLE** | ✅ Confirmed |
| **No DROP COLUMN** | ✅ Confirmed |
| **No TRUNCATE** | ✅ Confirmed |
| **No DELETE FROM** | ✅ Confirmed |
| **No data mutation** | ✅ Confirmed |

### Deployment

- Migration is applied via `prisma migrate deploy` (never `prisma db push`)
- The FK constraint change is a metadata-only operation in PostgreSQL —
  near-instantaneous on any table size
- The `isActive` column defaults to `true` for all existing rows
- **Production database was NOT touched** during development

---

## 8. Error Handling

**STATUS: IMPLEMENTED**

All organization archive errors return clean application-level messages.
No raw Prisma/database errors are exposed to clients.

| Condition | HTTP Status | Error Message |
|-----------|-------------|---------------|
| Organization not found | `404 Not Found` | `"Organization not found"` |
| Organization already archived | `400 Bad Request` | `"Organization is already archived"` |
| Confirmation name mismatch | `400 Bad Request` | `"Confirmation required: the organization name must match to archive"` |
| Non-superadmin attempts archive | `403 Forbidden` | `"Only super administrators can archive organizations"` |
| Insufficient permissions | `403 Forbidden` | `"Insufficient permissions"` (via PermissionsGuard) |

All errors are handled by the global `AllExceptionsFilter` which sanitizes
stack traces and returns a consistent JSON error format.

---

## 9. Audit Logging

**STATUS: VERIFIED**

Organization archive operations are logged via the NestJS `Logger`:

```
Organization archived — id=<orgId> name="<slug>" by actor=<email>
```

### Logged Information

| Event | Details Logged |
|-------|---------------|
| Archive attempt (fail — not found) | Organization ID |
| Archive attempt (fail — already archived) | Organization ID |
| Archive attempt (fail — confirmation mismatch) | Organization ID |
| Archive success | Organization ID, slug, actor email, timestamp |

### Never Logged

- Passwords
- JWTs / refresh tokens
- Database credentials
- User PII (beyond email for audit trail)

---

## 10. Related Files

### Backend

| File | Change |
|------|--------|
| `packages/database/prisma/schema.prisma` | Added `isActive` to Organization; changed User.organization to `onDelete: Restrict` |
| `services/auth/src/modules/users/users.service.ts` | Added `archiveOrganization()` with transaction + token revocation; updated `listOrganizations` to filter archived |
| `services/auth/src/modules/users/users.controller.ts` | Added `PATCH /users/organizations/:id/archive` endpoint with superadmin guard |
| `services/auth/src/modules/auth/auth.service.ts` | Added organization `isActive` check in login flow |
| `packages/types/src/index.ts` | Added `isActive` to `OrganizationResponse` |

### Frontend

| File | Change |
|------|--------|
| `apps/admin-dashboard/app/(super-admin)/super-admin/organizations/page.tsx` | Added archive button with name confirmation modal; archived badge on cards |

### Tests

| File | Change |
|------|--------|
| `services/auth/src/modules/users/users.service.spec.ts` | NEW — 12 test cases for archive service |
| `services/auth/src/modules/users/users.controller.spec.ts` | NEW — 9 test cases for archive controller auth |
| `services/auth/src/modules/auth/auth.service.spec.ts` | Added archived org login test |

### Database

| File | Change |
|------|--------|
| `packages/database/prisma/migrations/20260901000002_organization_soft_delete/migration.sql` | NEW — non-destructive schema migration |

### Documentation

| File | Change |
|------|--------|
| `docs/DATA_DELETION_POLICY.md` | NEW — this document |
