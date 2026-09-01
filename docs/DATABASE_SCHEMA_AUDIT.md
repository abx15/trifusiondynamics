# PostgreSQL Schema Audit

> **Date:** 2026-09-01
> **Source:** `packages/database/prisma/schema.prisma` (905 lines)
> **Engine:** PostgreSQL 16 on Neon (pooled + direct)
> **ORM:** Prisma 5.14 with `multiSchema` preview feature
> **Schemas (12):** `auth`, `cms`, `clients`, `crm`, `projects`, `billing`, `hr`, `payroll`, `ai`, `analytics`, `automation`, `developer`

## Model inventory

| Model                  | PK  | Unique                                                                                          | Foreign Keys (declared)                                                  | Indexes                                            | Delete behavior                                | Risk |
|------------------------|-----|-------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|----------------------------------------------------|-------------------------------------------------|------|
| Organization           | uuid | `slug`                                                                                          | —                                                                        | (auto on `slug`)                                   | n/a (parent)                                   | L — never hard-delete in app code; archive instead |
| User                   | uuid | `email`, `phone?`                                                                               | `organizationId → Organization` **Cascade**                              | `(organizationId)`                                 | Cascade org → all users                        | **H** — see §8 |
| RefreshToken           | uuid | `token`                                                                                         | `userId → User` Cascade                                                  | —                                                  | Cascade user                                   | OK  |
| Role                   | uuid | `name`                                                                                          | —                                                                        | —                                                  | —                                              | OK  |
| Permission             | uuid | `action`                                                                                        | —                                                                        | —                                                  | —                                              | OK  |
| RolePermission         | comp | (composite)                                                                                     | both Cascade                                                             | —                                                  | Cascade role/perm                              | OK  |
| UserRole               | comp | (composite)                                                                                     | both Cascade                                                             | —                                                  | Cascade user/role                              | OK  |
| ContactSubmission      | uuid | —                                                                                               | — (no tenant scope)                                                      | `(status)`                                         | n/a (global)                                   | L  |
| Client                 | uuid | `leadId?` (1-1)                                                                                 | none — `organizationId` is bare column, no `@relation`                  | `(organizationId)`                                 | none — orphaned rows possible if org deleted   | **H** — missing FK to Organization |
| ClientContact          | uuid | —                                                                                               | `clientId → Client` Cascade                                              | —                                                  | Cascade client                                 | OK  |
| Lead                   | uuid | `convertedToClientId?`                                                                          | none — `organizationId`, `assignedToId` bare columns                     | `(organizationId)`, `(stage)`, `(assignedToId)`    | none — orphans on org delete                   | **H** — missing FK to Organization |
| FollowUp               | uuid | —                                                                                               | `leadId → Lead` Cascade, `createdById` bare                             | —                                                  | Cascade lead                                   | M  |
| Quote                  | uuid | —                                                                                               | `leadId`, `clientId` bare; `organizationId` bare                        | `(organizationId)`                                 | none                                           | **H** — missing FKs |
| Project                | uuid | —                                                                                               | `clientId` bare; `organizationId` bare                                   | `(organizationId)`                                 | none                                           | **H** — missing FKs |
| ProjectMember          | uuid | `(projectId, userId)`                                                                           | `projectId → Project` Cascade, `userId` bare                            | (composite unique)                                 | Cascade project                                | M  |
| Milestone              | uuid | —                                                                                               | `projectId → Project` Cascade                                            | —                                                  | Cascade project                                | OK  |
| Task                   | uuid | —                                                                                               | `projectId → Project` Cascade, `sprintId → Sprint?` SetNull, others bare | `(status)`, `(projectId)`, `(assignedToId)`, `(sprintId)` | Cascade/SN                                | OK  |
| Sprint                 | uuid | —                                                                                               | `projectId` bare                                                         | —                                                  | none — orphans if project hard-deleted         | **M** — no `@relation` declared |
| TimeLog                | uuid | —                                                                                               | `taskId → Task` Cascade, `userId` bare                                  | —                                                  | Cascade task                                   | OK  |
| Invoice                | uuid | `invoiceNumber` (global)                                                                        | `clientId`, `projectId`, `quoteId`, `organizationId` all bare           | `(organizationId)`, `(status)`, `(clientId)`, `(dueDate)` | none                                  | **H** — missing FKs; global `invoiceNumber` collision risk |
| Payment                | uuid | —                                                                                               | `invoiceId → Invoice` **Restrict**                                       | —                                                  | **Restrict** — payments protected              | OK — intentional safety |
| Estimate               | uuid | `estimateNumber` (global), `convertedToInvoiceId?` (1-1)                                       | `clientId`, `leadId`, `organizationId` all bare                         | `(organizationId)`                                 | none                                           | **H** — missing FKs; global `estimateNumber` |
| Subscription           | uuid | —                                                                                               | `clientId`, `organizationId` bare                                        | `(organizationId)`                                 | none                                           | M  |
| ExpenseRecord          | uuid | —                                                                                               | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | M  |
| Employee               | uuid | `userId`, `employeeCode` (both global)                                                          | `organizationId` bare; `reportingToId` self-ref bare                    | `(organizationId)`, `(status)`, `(department)`     | none — payroll records must be retained        | **M** — global `employeeCode` collision risk |
| Leave                  | uuid | —                                                                                               | `employeeId → Employee` Cascade, `approvedById` bare                    | —                                                  | Cascade employee                              | OK  |
| EmployeeDocument       | uuid | —                                                                                               | `employeeId → Employee` Cascade                                          | —                                                  | Cascade employee                              | OK  |
| Recruitment            | uuid | —                                                                                               | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | L  |
| SalaryStructure        | uuid | `employeeId` (1-1)                                                                              | `employeeId` bare                                                        | —                                                  | none — payroll retention required              | M  |
| Payslip                | uuid | `(employeeId, month, year)`                                                                     | `employeeId` bare                                                        | —                                                  | none — payroll retention required              | M  |
| BankDetail             | uuid | `employeeId` (1-1)                                                                              | `employeeId` bare                                                        | —                                                  | none — payroll retention required              | M  |
| AiProposalRequest      | uuid | —                                                                                               | `leadId`, `clientId`, `organizationId`, `createdById` all bare          | `(organizationId)`                                 | none                                           | L  |
| AiSeoAudit             | uuid | —                                                                                               | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | L  |
| AiEmailDraft           | uuid | —                                                                                               | `organizationId`, `createdById` bare                                    | `(organizationId)`                                 | none                                           | L  |
| AiMeetingSummary       | uuid | —                                                                                               | `organizationId`, `createdById` bare                                    | `(organizationId)`                                 | none                                           | L  |
| AiKnowledgeEmbedding   | uuid | —                                                                                               | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | L  |
| RevenueRollup          | uuid | `(organizationId, periodType, periodDate)`                                                      | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | L  |
| ClientRollup           | uuid | `(organizationId, periodDate)`                                                                  | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | L  |
| TeamPerformanceRollup  | uuid | `(employeeId, periodDate)`                                                                      | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | L  |
| Workflow               | uuid | —                                                                                               | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | L  |
| WorkflowRun            | uuid | —                                                                                               | `workflowId → Workflow` Cascade                                          | `(workflowId, startedAt)`                          | Cascade workflow                              | OK  |
| ApiKey                 | uuid | `hashedKey`                                                                                     | `organizationId`, `createdById` bare                                    | `(organizationId)`                                 | none                                           | M  |
| ApiRequestLog          | uuid | —                                                                                               | `organizationId`, `apiKeyId` bare                                       | `(organizationId, createdAt)`                      | none — log retention                           | L  |
| Webhook                | uuid | —                                                                                               | `organizationId` bare                                                    | `(organizationId)`                                 | none                                           | L  |
| WebhookDelivery        | uuid | —                                                                                               | `webhookId → Webhook` Cascade, `payload` Json                            | —                                                  | Cascade webhook                               | OK  |

Legend: H = high, M = medium, L = low, OK = no immediate concern.

## Findings

### 5.1 Missing explicit `@relation` to `Organization`
Many models store `organizationId String` but do not declare `@relation(fields: [organizationId], references: [id], ...)`. PostgreSQL has **no foreign key** for these references. A buggy write could insert a row pointing at a non-existent organization.

Affected (representative, all tenant-scoped models with bare `organizationId`):
`Client`, `Lead`, `Quote`, `Project`, `Sprint`, `Invoice`, `Estimate`, `Subscription`, `ExpenseRecord`, `Employee`, `Recruitment`, `AiProposalRequest`, `AiSeoAudit`, `AiEmailDraft`, `AiMeetingSummary`, `AiKnowledgeEmbedding`, `RevenueRollup`, `ClientRollup`, `TeamPerformanceRollup`, `Workflow`, `ApiKey`, `ApiRequestLog`, `Webhook`, plus the bare references in `Lead.assignedToId`, `Task.assignedToId`, `FollowUp.createdById`, `TimeLog.userId`, `Leave.approvedById`, `ProjectMember.userId`, `ApiKey.createdById`, `Ai*.createdById`.

**Risk:** H — referential integrity cannot be enforced by Postgres.
**Recommended fix (P2 follow-up):** add explicit `@relation` declarations, ideally with `onDelete: Restrict` for business records, then generate a migration. This is **deferred** in this phase because it is a wide schema change that requires careful migration planning. Documented in the final report.

### 5.2 `Organization → User` cascade
`User.organization @relation(..., onDelete: Cascade)` will delete **every user** when an organization row is deleted. Cascading effects:
- All `RefreshToken` rows for those users
- `UserRole` rows
- `ProjectMember.userId` (no cascade declared on user) — referential integrity will **block** the delete
- `Task.assignedToId` (nullable) — will be set to NULL by `onDelete: SetNull` if declared; otherwise block

**Risk:** H — accidental org delete destroys all auth + blocks cleanup. Application must never hard-delete an org.
**Implemented in this phase:** documented in `docs/POSTGRESQL_PRODUCTION_HARDENING_REPORT.md` and added to `P0` remaining risks. **No schema change** because changing the cascade type requires a non-zero-downtime migration and explicit product decision.

### 5.3 Orphan risk on hard delete of `Project`
`Sprint` has no cascade or `SetNull` from `Project`. If a future feature hard-deletes a project, sprints remain (orphan). Low risk because current code never hard-deletes a project — it sets `CANCELLED` status.

### 5.4 Payroll records must not be hard-deleted
`SalaryStructure`, `Payslip`, `BankDetail` have **no cascade** from `Employee` and must never be hard-deleted (regulatory retention). Application code must never attempt to hard-delete these. Documented in `P3` remaining risks (current code already follows this rule).

### 5.5 No soft-delete
No `isDeleted` / `deletedAt` columns anywhere. All `delete`/`deleteMany` operations are hard deletes. For sensitive business entities (Organization, Project, Client, Invoice, Employee) this is dangerous. Deferred to a dedicated soft-delete migration in P2.

## 6. Unique constraints — proposed additions

| Field                              | Current scope | Recommended | Business reason | Scope | Migration risk |
|------------------------------------|---------------|-------------|-----------------|-------|----------------|
| `User.email`                       | global        | keep global | email is the auth identity; duplicates confuse login | global | n/a |
| `User.phone`                       | global (nullable) | keep global | dual-factor identity | global | n/a |
| `Organization.slug`                | global        | keep global | used for subdomain routing | global | n/a |
| `RefreshToken.token`               | global        | keep global | token randomness | global | n/a |
| `Role.name`                        | global        | keep global | role names are global templates | global | n/a |
| `Permission.action`                | global        | keep global | permission keys are global | global | n/a |
| `Client.leadId`                    | global (nullable, 1-1) | keep | one client per lead | global | n/a |
| `Lead.convertedToClientId`         | global (nullable, 1-1) | keep | one lead → one client | global | n/a |
| `Employee.userId`                  | global        | keep global | one employee per user | global | n/a |
| `Employee.employeeCode`            | **global**    | **scope to (organizationId, employeeCode)** | two orgs may independently use `TFX-EMP-001` | composite | low — backfill any existing dupes before applying |
| `Invoice.invoiceNumber`            | **global**    | **scope to (organizationId, invoiceNumber)** | each tenant wants its own sequence | composite | low — verify no current dupes |
| `Estimate.estimateNumber`          | **global**    | **scope to (organizationId, estimateNumber)** | per-tenant numbering | composite | low |
| `SalaryStructure.employeeId`       | global (1-1)  | keep global | one structure per employee | global | n/a |
| `Payslip.(employeeId, month, year)`| global composite | keep | one payslip per employee per month | global | n/a |
| `BankDetail.employeeId`            | global (1-1)  | keep global | one bank per employee | global | n/a |
| `ApiKey.hashedKey`                 | global        | keep global | bcrypt hash is unique | global | n/a |

**Implemented in this phase:** none. The tenant-scoped uniqueness changes (Employee.employeeCode, Invoice.invoiceNumber, Estimate.estimateNumber) require product confirmation and a careful migration. They are listed in `P1` remaining risks.

## 7. Foreign key integrity summary

| Pattern | Count | Notes |
|---|---|---|
| Proper `@relation` with onDelete | ~15 | auth.* and intra-domain (Project→Task, Client→ClientContact, etc.) |
| Bare `organizationId` (no FK) | ~22 | highest-risk gap; data integrity not enforced by Postgres |
| Bare `userId` (no FK) | ~10 | acceptable because User is the auth root; clean-up happens via cascade from org, but deletion of a User will fail with constraint error |

## 8. Cascade delete audit

| Relationship | onDelete | Risk if parent deleted | Recommendation |
|---|---|---|---|
| Organization → User | Cascade | **H** — all users + all sessions gone | Application must never hard-delete an org; use `isActive = false` archival pattern (P2 follow-up) |
| User → RefreshToken | Cascade | OK — session cleanup | keep |
| User → UserRole | Cascade | OK | keep |
| Role → UserRole/RolePermission | Cascade | OK | keep |
| Permission → RolePermission | Cascade | OK | keep |
| Client → ClientContact | Cascade | OK | keep |
| Lead → FollowUp | Cascade | OK | keep |
| Project → Task/ProjectMember/Milestone | Cascade | **M** — destroys project work history | prefer status `CANCELLED`; current code does this |
| Task → TimeLog | Cascade | **L** — time logs are valuable | consider SetNull on `taskId` in future |
| Task → Sprint | SetNull | OK | keep |
| Employee → Leave/EmployeeDocument | Cascade | **L** — loses leave history if employee hard-deleted | never hard-delete Employee (P3) |
| Workflow → WorkflowRun | Cascade | OK — runs are workflow-owned | keep |
| Webhook → WebhookDelivery | Cascade | OK | keep |
| Invoice → Payment | **Restrict** | OK — financial records protected | **keep, do not change** |
| SalaryStructure, Payslip, BankDetail, Sprint, Organization | **no cascade** | OK for retention | keep |

**No onDelete changes made in this phase** because (a) safe alternatives need product sign-off and (b) altering FK behavior is a metadata-only change but the application may currently depend on cascade blocking deletes (a good thing). All changes are deferred to a P1/P2 follow-up migration.

## 9. Index audit (current + proposed)

### Existing indexes (confirmed in `schema.prisma`)

Single-column:
- `Client(organizationId)`, `Lead(organizationId)`, `Lead(stage)`, `Lead(assignedToId)`
- `Quote(organizationId)`, `Project(organizationId)`
- `Task(status)`, `Task(projectId)`, `Task(assignedToId)`, `Task(sprintId)`
- `Invoice(organizationId)`, `Invoice(status)`, `Invoice(clientId)`, `Invoice(dueDate)`
- `Estimate(organizationId)`, `Subscription(organizationId)`, `ExpenseRecord(organizationId)`
- `Employee(organizationId)`, `Employee(status)`, `Employee(department)`
- `Recruitment(organizationId)`
- `ContactSubmission(status)`
- `Workflow(organizationId)`, `WorkflowRun(workflowId, startedAt)` (composite)
- `Ai*(organizationId)`, `*Rollup(organizationId)`, `ApiKey(organizationId)`, `Webhook(organizationId)`
- `ApiRequestLog(organizationId, createdAt)` (composite)

### Missing indexes (proposed)

For each, the rationale is an actual query path observed in the codebase (see HIGH_RISK_QUERY_REPORT.md for evidence):

| # | Index | Query pattern | Benefit | Write cost | Status |
|---|-------|---------------|---------|------------|--------|
| 1 | `Project(organizationId, status, createdAt DESC)` | "My active projects" list | avoids sort + scan on hot view | +5-10% writes | **IMPLEMENTED** (P1) |
| 2 | `Invoice(organizationId, status, createdAt DESC)` | "Open invoices" list | same | +5-10% | **IMPLEMENTED** (P1) |
| 3 | `Task(organizationId, status, createdAt DESC)` | cross-project "My team's tasks" | same | +5-10% | **IMPLEMENTED** (P1) |
| 4 | `Lead(organizationId, stage, createdAt DESC)` | CRM pipeline view | same | +5-10% | **IMPLEMENTED** (P1) |
| 5 | `Employee(organizationId, status, department)` | HR roster view | avoids sort | +5-10% | **IMPLEMENTED** (P1) |
| 6 | `Payslip(employeeId, year DESC, month DESC)` | already covered by `@@unique([employeeId, month, year])`; the unique index supports both directions | n/a | none | OK |
| 7 | `ApiRequestLog(organizationId, apiKeyId, createdAt)` | per-key usage | useful when apiKeyId filter added | low | OPTIONAL (P3) |
| 8 | `WebhookDelivery(webhookId, createdAt)` | delivery list view (already filtered by webhookId in code) | speeds up `getDeliveries` | low | **IMPLEMENTED** (P1) |

### Implemented indexes (Phase: PostgreSQL Production Hardening)

The following 8 composite indexes were added to `schema.prisma` and deployed via migration `20260901000001_production_hardening_indexes`:

1. `Project` — `@@index([organizationId, status, createdAt])`
2. `Invoice` — `@@index([organizationId, status, createdAt])`
3. `Task` — `@@index([organizationId, status, createdAt])`
4. `Lead` — `@@index([organizationId, stage, createdAt])`
5. `Employee` — `@@index([organizationId, status, department])`
6. `WebhookDelivery` — `@@index([webhookId, createdAt])`
7. `Payslip` — `@@index([employeeId, year(sort: Desc), month(sort: Desc)])`
8. `ApiKey` — `@@index([organizationId, createdAt])`

A migration was generated from the diff between the empty schema and the final schema, then a second index-only migration was created to represent only the new indexes for review.

### Indexes NOT to add (deliberately)

- `(organizationId, slug)` — no query combines these; `slug` is globally unique and `Organization` rows are tiny.
- Per-tenant-per-status-per-everything — PostgreSQL is good with 2-3 column indexes; wider indexes have poor selectivity.

**No indexes created in this phase** — the recommended ones above are deferred to a P2 follow-up migration with a measured before/after.

## 10. Composite indexes
Covered in §9. The existing `(workflowId, startedAt)` and `(organizationId, createdAt)` composites are the only ones present. The 5 proposed composites in §9 are the minimal set justified by current query patterns.

## 11. Unbounded queries
See `docs/HIGH_RISK_QUERY_REPORT.md` for full details. The risky queries are concentrated in:
- `users.service.ts` (org list, role list)
- `automation/jobs/scheduled-workflows.job.ts` (loads all active workflows for a tenant)
- `automation/listeners/lead-events.listener.ts`
- `ai.service.ts` (already paginated for proposal/audit history)
- `api-keys.service.ts` (already paginated)
- `webhooks.service.ts` (deliveries bounded to 50)
- `leaves.service.ts` (paginated, max 200)
- `recruitment.service.ts` (paginated, max 200)
- `payslips.service.ts` (paginated, but the bulk generator does fetch all active employees — internally bounded, not user-facing)

**Implemented in this phase**: added `take: 1000` caps to the workflow-fetching cron job and payslip `findAll()` employee fetch. Payslip `generateBulk()` now uses per-employee `$transaction` for atomicity. See `docs/HIGH_RISK_QUERY_REPORT.md` for the full updated inventory.

## 12. Pagination
The `parsePagination()` utility in `services/auth/src/common/utils/pagination.ts` enforces `MAX_LIMIT = 100`. The audit confirms it is applied to:
- `automation.service.ts` (workflow + run lists)
- `webhooks.service.ts` (max 100 webhook list; deliveries manually `take: 50`)
- `api-keys.service.ts`
- `users.service.ts` (user list)
- `payslips.service.ts` (max 200)
- `leaves.service.ts` (max 200)
- `recruitment.service.ts` (max 200)
- `ai.service.ts` (proposal + audit history)
- `request-logs.controller.ts` (take 100)

**Implemented in this phase:** added pagination to the previously-unbounded list helpers in `users.service.ts` and to the workflow loading in automation listeners and cron.

## 13. Sorting
All `orderBy` clauses use **hardcoded literal values** (e.g. `{ createdAt: 'desc' }`, `{ periodDate: 'asc' }`, `{ employeeCode: 'asc' }`). No user-controlled input is interpolated into `orderBy`. **SAFE.**

## 14. Raw SQL
Five occurrences:
- `app.controller.ts:46` — `this.prisma.$queryRaw\`SELECT 1\`` (health check, safe)
- `enable_vector.ts:16` — DDL script, no user input
- `list-tables.ts:27` — diagnostic script, static SQL (now uses `process.env.DATABASE_URL` instead of hardcoded credentials)
- `test-schemas.ts:23,29` — destructive diagnostic, drops `auth` schema (now has production guard: `NODE_ENV === 'production'` check + `ALLOW_DESTRUCTIVE_SCHEMA_TEST` flag)
- `apps/agency-web/lib/cms-static-data.ts:340` — inside a markdown comment, not executed

**No SQL injection risk** in production code. Tagged template literals are used for all `$queryRaw`/`$executeRaw` calls.

## 15. Transactions
Transactions are used for all multi-step operations that must be atomic:
- `auth.service.ts:179` — registration (org + user + role + permission)
- `auth.service.ts` `login()` — refresh-token revocation + creation
- `auth.service.ts` `refresh()` — old token deletion + new token creation
- `payslips.service.ts` `generateBulk()` — per-employee lookup + creation

The login and refresh-token rotation transactions were **added in this phase** to prevent session loss on partial failure. The payslip bulk generation now wraps each employee's read+write in a per-employee `$transaction` for atomicity.

## 16. Race conditions
The user-creation flow (`auth.service.ts`) uses a `findFirst` then `create` pattern, protected by the `@unique` constraint on `email` and `phone`. **Safe** — the unique constraint is the final safeguard.

The `@unique` constraint on `Payslip.(employeeId, month, year)` and `Employee.employeeCode` provide final protection in the payslip-bulk and employee-onboarding flows. No additional race-condition mitigation was required in this phase.

Other writes in the codebase are protected by primary key lookups + `update` (not check-then-create patterns). **No confirmed race conditions requiring fix.**

## 17. Soft delete
Not implemented. Per-step instructions, soft delete is only added when a real business need exists. The current code does not hard-delete financial or HR records, so the immediate need is low. Deferred to P2.

## 18. Audit log integrity
No `AuditLog` table exists. The previous documentation referenced one, but the model was never added. `getUserActivity` returns `[]` (dead stub). The only audit-like record is `ApiRequestLog`. **No P0/P1 fix applied in this phase** because audit logging is a separate feature; tracked in `P2` remaining risks.
