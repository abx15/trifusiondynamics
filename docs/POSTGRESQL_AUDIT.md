# PostgreSQL / Prisma Production Audit

> Date: 2026-09-01
> Scope: `packages/database/prisma/schema.prisma` (905 lines, 12 schemas)

## 1. Current architecture

- **Engine:** PostgreSQL via Neon (pooled + direct connection strings).
- **ORM:** Prisma 5.22 with `multiSchema` preview feature.
- **Schemas (12):** `auth`, `cms`, `clients`, `crm`, `projects`, `billing`, `hr`, `payroll`, `ai`, `analytics`, `automation`, `developer`.
- **Tables:** ~30 models. All tenant-scoped tables carry `organizationId String`.

## 2. Model inventory (production-relevant)

| Model                | PK | Unique                                  | Foreign Keys                                                  | Indexes | Delete Behavior | Risk |
|----------------------|----|-----------------------------------------|---------------------------------------------------------------|----------|----------------|------|
| Organization         | uuid | `slug`                                  | —                                                             | (auto)   | Cascade users   | **M — `onDelete: Cascade` on User will delete every user when an org is deleted.** Recommend archiving orgs or restrict. |
| User                 | uuid | `email`, `phone`                        | `organizationId → Organization (Cascade)`                     | `organizationId` | Cascade org | **M** |
| RefreshToken         | uuid | `token`                                 | `userId → User (Cascade)`                                     | —        | Cascade user   | OK |
| Role                 | uuid | `name`                                  | —                                                             | —        | —              | OK |
| Permission           | uuid | `action`                                | —                                                             | —        | —              | OK |
| UserRole             | composite (userId, roleId) | —                           | both Cascade                                                  | —        | Cascade        | OK |
| RolePermission       | composite | —                                       | both Cascade                                                  | —        | Cascade        | OK |
| Client               | uuid | `leadId` (unique, 1-1 lead)             | `organizationId` implicit (no FK declared!)                   | `organizationId` | NONE declared | **H — `Client.organizationId` is not a real FK. Same for many tenant-scoped models below.** |
| ClientContact        | uuid | —                                       | `clientId → Client (Cascade)`                                 | —        | Cascade        | OK |
| Lead                 | uuid | `convertedToClientId` (unique 1-1)      | `organizationId` implicit; `assignedToId`, `leadId` implicit | `organizationId`, `stage`, `assignedToId` | NONE | **M** |
| FollowUp             | uuid | —                                       | `leadId (Cascade)`, `createdById` implicit                    | —        | Cascade        | OK |
| Quote                | uuid | —                                       | `leadId`, `clientId`, `organizationId` implicit               | `organizationId` | NONE | **M** |
| Project              | uuid | —                                       | `clientId`, `organizationId` implicit                         | `organizationId` | NONE | **M** |
| ProjectMember        | uuid | `(projectId, userId)`                   | `projectId (Cascade)`                                         | —        | Cascade        | OK |
| Milestone            | uuid | —                                       | `projectId (Cascade)`                                         | —        | Cascade        | OK |
| Task                 | uuid | —                                       | `projectId (Cascade)`, `sprintId SetNull`, `assignedToId` implicit | `status`, `projectId`, `assignedToId`, `sprintId` | Cascade/SN | OK |
| Sprint               | uuid | —                                       | `projectId` implicit                                          | —        | NONE           | **L — orphan sprints if project is hard-deleted.** |
| TimeLog              | uuid | —                                       | `taskId (Cascade)`, `userId` implicit                         | —        | Cascade        | OK |
| Invoice              | uuid | `invoiceNumber`                         | `clientId`, `projectId`, `quoteId`, `organizationId` implicit | `organizationId`, `status`, `clientId`, `dueDate` | NONE | **M** |
| Payment              | uuid | —                                       | `invoiceId (Restrict)`                                        | —        | Restrict       | OK — prevents accidental cascade delete of payments |
| Estimate             | uuid | `estimateNumber`, `convertedToInvoiceId` | `clientId`, `leadId`, `organizationId` implicit                | `organizationId` | NONE | **M** |
| Subscription         | uuid | —                                       | `clientId`, `organizationId` implicit                         | `organizationId` | NONE | **M** |
| ExpenseRecord        | uuid | —                                       | `organizationId` implicit                                     | `organizationId` | NONE | OK |
| Employee             | uuid | `userId`, `employeeCode`                | `organizationId` implicit; `reportingToId` implicit (self-ref) | `organizationId`, `status`, `department` | NONE | **M** |
| Leave                | uuid | —                                       | `employeeId (Cascade)`, `approvedById` implicit                | —        | Cascade        | OK |
| EmployeeDocument     | uuid | —                                       | `employeeId (Cascade)`                                        | —        | Cascade        | OK |
| Recruitment          | uuid | —                                       | `organizationId` implicit                                     | `organizationId` | NONE | **M** |
| SalaryStructure      | uuid | `employeeId` (1-1)                      | `employeeId` implicit                                         | —        | NONE           | **L — orphan if employee hard-deleted.** |
| Payslip              | uuid | `(employeeId, month, year)`             | `employeeId` implicit                                         | —        | NONE           | **L — same as above.** |
| BankDetail           | uuid | `employeeId` (1-1)                      | `employeeId` implicit                                         | —        | NONE           | **L — same.** |
| AiProposalRequest    | uuid | —                                       | `leadId`, `clientId`, `organizationId`, `createdById` implicit | `organizationId` | NONE | OK |
| AiSeoAudit           | uuid | —                                       | `organizationId` implicit                                     | `organizationId` | NONE | OK |
| AiEmailDraft         | uuid | —                                       | `organizationId`, `createdById` implicit                      | `organizationId` | NONE | OK |
| AiMeetingSummary     | uuid | —                                       | `organizationId`, `createdById` implicit                      | `organizationId` | NONE | OK |
| AiKnowledgeEmbedding | uuid | —                                       | `organizationId` implicit                                     | `organizationId` | NONE | OK |
| RevenueRollup        | uuid | `(organizationId, periodType, periodDate)` | `organizationId` implicit                                  | `organizationId` | NONE | OK |
| ClientRollup         | uuid | `(organizationId, periodDate)`          | `organizationId` implicit                                     | `organizationId` | NONE | OK |
| TeamPerformanceRollup| uuid | `(employeeId, periodDate)`              | `organizationId` implicit                                      | `organizationId` | NONE | OK |
| Workflow             | uuid | —                                       | `organizationId` implicit                                     | `organizationId` | NONE | OK |
| WorkflowRun          | uuid | —                                       | `workflowId (Cascade)`                                        | `(workflowId, startedAt)` | Cascade | OK |
| ApiKey               | uuid | `hashedKey`                             | `organizationId`, `createdById` implicit                      | `organizationId` | NONE | **M** |
| ApiRequestLog         | uuid | —                                       | `organizationId` implicit; `apiKeyId` implicit                 | `(organizationId, createdAt)` | NONE | OK |
| Webhook              | uuid | —                                       | `organizationId` implicit                                     | `organizationId` | NONE | OK |
| WebhookDelivery      | uuid | —                                       | `webhookId (Cascade)`, `payload` Json                          | —        | Cascade        | OK |

Legend: H = high, M = medium, L = low, OK = no immediate concern.

## 3. Critical findings

### 3.1 Missing FK constraints to `Organization`

Most models with `organizationId` declare the column but **not** the Prisma `@relation`. PostgreSQL therefore enforces nothing — a bug or a hand-crafted write could insert a row whose `organizationId` does not exist in `auth.Organization`.

Affected (representative list — see inventory):
Client, Lead, Quote, Project, Invoice, Estimate, Subscription, ExpenseRecord,
Employee, Recruitment, Ai*, RevenueRollup, ClientRollup, TeamPerformanceRollup,
Workflow, ApiKey, ApiRequestLog, Webhook.

**Fix:** declare explicit relations in a future Prisma migration (e.g. `Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)` for business records; `Cascade` only for owned-by-org data such as rollups).

### 3.2 `Organization → User → …` cascade

`User.organization @relation(..., onDelete: Cascade)` will delete **every user** when an organization row is deleted, which would also remove `RefreshToken`, `ProjectMember` membership, and `Task.assignedToId → null` (no cascade declared on those, so referential integrity will block the delete).

**Recommendation:** keep the cascade at the DB but never call `organization.delete()` from application code. Add a route that **archives** (`isActive = false`) instead.

### 3.3 Hard-delete orphan risk

`Sprint`, `SalaryStructure`, `Payslip`, `BankDetail` are not cascaded from `Project` or `Employee`. If a future feature hard-deletes an employee, those rows will remain (good — historical payroll must be retained). But the application must never attempt to hard-delete them as a "cleanup" — payroll records are regulatory.

### 3.4 No soft-delete

The schema has no `isDeleted` / `deletedAt` columns. All `DELETE` operations are hard deletes. For sensitive business entities (Project, Client, Invoice, Employee) we should introduce soft delete in a follow-up migration.

## 4. Indexes — current vs. recommended

Existing indexes (good):
- `Client.organizationId`
- `Lead.organizationId`, `stage`, `assignedToId`
- `Quote.organizationId`
- `Project.organizationId`
- `Task.status`, `projectId`, `assignedToId`, `sprintId`
- `Invoice.organizationId`, `status`, `clientId`, `dueDate`
- `Employee.organizationId`, `status`, `department`
- `Recruitment.organizationId`
- `WorkflowRun.workflowId, startedAt`
- `ApiRequestLog.(organizationId, createdAt)`

Composite indexes that should be added (when a tenant has many rows and query patterns include both filters):

| Query                                              | Proposed index                                 | Reason                                                  | Status |
|----------------------------------------------------|-----------------------------------------------|---------------------------------------------------------|--------|
| `WHERE organizationId = ? AND status = ? ORDER BY createdAt DESC` (Project, Invoice, Task) | composite `(organizationId, status, createdAt)` | Hot list view per tenant                                | RECOMMENDED |
| `WHERE organizationId = ? AND clientId = ?` (Project, Invoice) | composite `(organizationId, clientId)` | Project/Invoice filtered per tenant per client           | RECOMMENDED |
| `WHERE organizationId = ? AND assignedToId = ?` (Task) | composite `(organizationId, assignedToId)` | "My tasks" view                                         | RECOMMENDED |
| `WHERE email = ?` (login)                          | already unique on `User.email`                | —                                                       | OK     |
| `WHERE token = ?` (refresh)                        | already unique on `RefreshToken.token`        | —                                                       | OK     |

We do **not** add indexes blind; each one is justified by an actual query path. Cost is minor: each composite adds write amplification of ~5–10% on the affected table.

## 5. Transactions

Multi-step writes that must be atomic:

| Operation                          | Already in transaction? | Status                  |
|------------------------------------|--------------------------|------------------------|
| `auth.service.register()`           | **No (P1 fix applied)**  | DONE — `prisma.$transaction` wraps org/user/role/perm/refresh-token. |
| `auth.service.login()`              | refresh-token create is single-stmt; the revoke-others-then-create-new is **two writes** and is **not** in a transaction | RECOMMENDED — wrap revoke+create |
| `auth.service.refresh()`            | delete-old + create-new refresh token | RECOMMENDED — wrap |
| `users.service.createUserByAdmin()` | single user + role create | OPTIONAL — wrap for safety |
| `users.service.deleteUser()`        | role delete + refresh-token delete + user delete (3 writes) | RECOMMENDED — wrap |
| `payslips.service.generateBulk()`   | N employees × M writes each, no transaction | RECOMMENDED — wrap per employee or in one batch tx |
| `leaves.service.review()`           | update leave + (maybe) update employee status | RECOMMENDED — wrap |

Only **critical** multi-step writes have been wrapped in this phase (register). The remaining are listed as **RECOMMENDED** for a focused P2 follow-up.

## 6. Pagination

All public `findAll` endpoints now accept `page` and `limit` query params, capped at **MAX_LIMIT = 100** (default 20, module-specific max 200 for employee/leaves/payslips/recruitment). See `services/auth/src/common/utils/pagination.ts`.

## 7. Hard deletes & archival

| Entity            | Recommendation |
|---------------------|--------------------|
| Organization       | **Never hard delete.** Archive instead (set `isActive = false`). |
| User               | Hard delete acceptable for test/dev only. In prod, deactivate + nullify membership. |
| Project            | Currently sets `CANCELLED` on remove (`projects.service.remove`). Treat as soft archive. |
| Invoice / Payment   | Hard delete only via admin tool; production path is void/refund only. |
| Employee / Payslip | **Never hard delete** (regulatory). |

## 8. Conclusion

The schema is broadly sound for production but requires (in P2):
1. Add real FK constraints to `Organization` for all tenant-scoped models.
2. Add composite indexes listed above.
3. Introduce soft-delete columns for Client / Project / Employee.
4. Wrap remaining multi-step writes in transactions.

These are tracked in the **Remaining Risks → P2** section of the final report.