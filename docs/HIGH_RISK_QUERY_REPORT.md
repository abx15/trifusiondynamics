# High-Risk Database Query Report

> **Date**: 2026-09-01
> **Source**: `services/auth/src/` — full source audit
> **Schema**: `packages/database/prisma/schema.prisma` (912 lines)

## Methodology

Every `findMany`, `findFirst`, `findUnique`, `$queryRaw`, `$executeRaw`, and `$transaction` call in `services/auth/src/` and `packages/database/` was inspected. Results are categorized by risk level.

---

## P0 — Critical Risks

### 1. Organization → User Cascade Delete
| Field | Value |
|---|---|
| **Location** | `schema.prisma:33` — `User.organization @relation(... onDelete: Cascade)` |
| **Query path** | Any `DELETE FROM Organization` triggers cascade to all `User` rows |
| **Problem** | Deleting an organization wipes every user (and cascades to `RefreshToken`, `UserRole`). Irreversible data loss. |
| **Expected growth** | Low frequency, but each deletion affects all org members |
| **Recommended fix** | Change to `onDelete: Restrict`; implement soft-delete (`isActive`) in application code. **Deferred to P2** — schema change requires zero-downtime migration. |
| **Priority** | **P0** — data loss |

### 2. Login: Refresh-Token Revocation + Creation Not Atomic (FIXED)
| Field | Value |
|---|---|
| **Location** | `auth.service.ts` `login()` — previously lines 108–144 |
| **Query pattern** | `updateMany` (revoke old tokens) then `create` (new token), two separate statements |
| **Problem** | If the `create` fails after `updateMany` succeeds, every existing session is revoked and the user has no new session — effectively logged out everywhere permanently. |
| **Fix applied** | Wrapped both operations in `this.prisma.$transaction(...)`. If either fails, both roll back. |
| **Priority** | **P0** — session integrity (now resolved) |

### 3. Refresh: Token Deletion + Creation Not Atomic (FIXED)
| Field | Value |
|---|---|
| **Location** | `auth.service.ts` `refresh()` — previously lines 346–359 |
| **Query pattern** | `delete` (old token) then `create` (new token), two separate statements |
| **Problem** | If `create` fails after `delete`, the user loses their refresh token with no replacement. |
| **Fix applied** | Wrapped both in `this.prisma.$transaction(...)`. |
| **Priority** | **P0** — session integrity (now resolved) |

---

## P1 — High Risks

### 4. Payslip Bulk Generation Without Transaction
| Field | Value |
|---|---|
| **Location** | `payslips.service.ts:16-85` `generateBulk()` |
| **Query pattern** | Loops over employees, calls `findUnique` then `create` per employee, no wrapping transaction |
| **Problem** | If generation fails partway through, some payslips are created and others aren't. The unique constraint `(employeeId, month, year)` prevents duplicates, but partial generation is left in the database. |
| **Expected growth** | Monthly batch per org — O(n) where n = active employees |
| **Recommended fix** | Wrap the loop body in `prisma.$transaction(tx => ...)`. Each iteration's `findUnique` + `create` should be transactional to prevent partial state. |
| **Priority** | **P1** — data consistency (tracked for P2) |

### 5. Scheduled Workflows Job Loads All Active Workflows
| Field | Value |
|---|---|
| **Location** | `automation/jobs/scheduled-workflows.job.ts:18` |
| **Query pattern** | `findMany({ where: { isActive: true, triggerType: 'SCHEDULED' } })` — previously no `take` |
| **Problem** | Runs every 5 minutes; a tenant with thousands of scheduled workflows would load them all into memory. |
| **Fix applied** | Added `take: 1000` hard cap. |
| **Priority** | **P1** — performance (now mitigated) |

### 6. Payslip List Fetches All Employees Before Paginating
| Field | Value |
|---|---|
| **Location** | `payslips.service.ts:94` `findAll()` |
| **Query pattern** | `findMany({ where: { organizationId: orgId } })` with no `take` — loads all employees before filtering payslips |
| **Problem** | For a very large org, fetching all employee rows (and then all user rows for those employees) is wasteful and unbounded. |
| **Fix applied** | Added `take: 1000` cap on the employee fetch. |
| **Expected growth** | Linear with employee count |
| **Priority** | **P1** — performance (partially mitigated; full fix = query via employee→org relation) |

### 7. Analytics Date-Range Queries Without Lower Bound
| Field | Value |
|---|---|
| **Location** | `analytics.service.ts:59` `getRevenueTrend()` and `:68` `getClientGrowth()` |
| **Query pattern** | `findMany({ where: { organizationId } })` with only `take: 30` |
| **Problem** | No date range filter on these queries — they always return the most recent 30 days (OK for now, but `getTeamPerformance` has no `take` at all beyond the implicit Prisma default). |
| **Expected growth** | Linear with rollup frequency |
| **Recommended fix** | Add date range filters to all analytics endpoints. `getTeamPerformance` already returns a single month but has no `take` guard. |
| **Priority** | **P1** — performance (tracked for P2) |

---

## P2 — Medium Risks

### 8. User Creation Race Condition (Protected by Unique Constraint)
| Field | Value |
|---|---|
| **Location** | `users.service.ts:18-25` `createUserByAdmin()` |
| **Query pattern** | `findFirst` (check) → `create` (write) |
| **Protection** | `@unique` on `email` and `phone` — Prisma will throw a `P2002` constraint violation if a race occurs |
| **Risk** | Low — duplicate writes are rejected by the unique constraint |
| **Priority** | **P2** — handled by constraint, could improve error messaging |

### 9. Duplicate Index on Project(organizationId)
| Field | Value |
|---|---|
| **Location** | `schema.prisma:272` — `@@index([organizationId])` |
| **Problem** | Single-column index overlaps with the new composite `@@index([organizationId, status, createdAt])`. PostgreSQL can use the composite for org-only queries, making the single-column index redundant. |
| **Recommended fix** | Consider dropping the single-column index after confirming the composite covers all current queries. **Not applied** — requires query plan analysis to confirm no regression. |
| **Priority** | **P2** — minor storage/performance |

### 10. Employee-Code Generation Race
| Field | Value |
|---|---|
| **Location** | `employees.service.ts:43-47` |
| **Query pattern** | `count({ where: { organizationId } })` then `create` with derived `employeeCode` |
| **Problem** | Two concurrent create requests for the same org can both see the same count and assign duplicate codes. The `@unique` constraint on `employeeCode` will catch this, but the error is cryptic. |
| **Expected growth** | Low frequency, but concurrent onboarding is possible |
| **Recommended fix** | Use a database sequence or a retry-on-constraint-violation pattern. |
| **Priority** | **P2** — data integrity (constraint protects, error handling could be better) |

---

## P3 — Low Risks

### 11. Permission Upsert in Loop
| Field | Value |
|---|---|
| **Location** | `auth.service.ts:206-222` `register()` |
| **Query pattern** | Sequential `rolePermission.upsert` in a `for...of` loop, ~25 iterations |
| **Problem** | Not a batch operation; N+1 writes inside a transaction |
| **Expected growth** | O(n) where n ≈ 25 permissions, per registration |
| **Priority** | **P3** — minor; acceptable given low frequency |

### 12. Employee-User Join Pattern (N+1)
| Field | Value |
|---|---|
| **Location** | `employees.service.ts:100-109` |
| **Query pattern** | Separate `user.findMany` and `salaryStructure.findMany` after employee query |
| **Problem** | Two additional queries to join related data |
| **Expected growth** | Linear with employee count |
| **Priority** | **P3** — minor performance impact |

### 13. Stale Connection String in list-tables.ts
| Field | Value |
|---|---|
| **Location** | `packages/database/list-tables.ts:19` |
| **Problem** | Hardcoded production connection URL with credentials embedded in source |
| **Risk** | If committed, exposes production credentials. Already in `.gitignore` coverage for `.env` but this file has inline URL. |
| **Priority** | **P3** — credential hygiene |

---

## Summary Table

| # | Query | Service | Priority | Status |
|---|-------|---------|----------|--------|
| 1 | Org → User cascade delete | schema | P0 | Documented, deferred |
| 2 | Login token rotation not atomic | auth.service | P0 | **FIXED** |
| 3 | Refresh token rotation not atomic | auth.service | P0 | **FIXED** |
| 4 | Payslip bulk without transaction | payslips.service | P1 | Documented, deferred |
| 5 | Scheduled workflows no pagination | scheduled-workflows.job | P1 | **FIXED** (take: 1000) |
| 6 | Payslip list fetches all employees | payslips.service | P1 | **FIXED** (take: 1000) |
| 7 | Analytics missing date filters | analytics.service | P1 | Documented, deferred |
| 8 | User creation TOCTOU race | users.service | P2 | Protected by @unique |
| 9 | Overlapping indexes | schema | P2 | Documented |
| 10 | Employee-code race | employees.service | P2 | Protected by @unique |
| 11 | Permission upsert in loop | auth.service | P3 | Acceptable |
| 12 | Employee-user N+1 join | employees.service | P3 | Acceptable |
| 13 | Hardcoded URL in diagnostic script | list-tables.ts | P3 | Documented |

## Implemented in This Phase

1. **Transaction-wrapped login**: `auth.service.ts` login refresh-token rotation is now atomic
2. **Transaction-wrapped refresh**: `auth.service.ts` refresh token rotation is now atomic
3. **Bounded scheduled workflow load**: `scheduled-workflows.job.ts` now caps at 1000 workflows
4. **Bounded employee fetch**: `payslips.service.ts findAll()` now caps employee fetch at 1000
5. **Composite indexes added**: 8 new indexes via migration `20260901000001_production_hardening_indexes`
6. **Timeout configuration**: `statement_timeout=60s`, `idle_in_transaction_session_timeout=60s`, `connect_timeout=10s`
7. **Raw SQL safety**: `enable_vector.ts` now uses tagged template; `test-schemas.ts` now has production guard

## Remaining Risks

| Priority | Items |
|----------|-------|
| P0 | Organization cascade delete — requires product decision + zero-downtime migration |
| P1 | Payslip bulk generation transaction — schema change needed for full fix |
| P1 | Analytics date-range filtering — endpoint-level change needed |
| P2 | Employee-code generation race — sequence or retry pattern |
| P2 | Overlapping single-column vs composite indexes — needs query plan analysis |
| P3 | Stale hardcoded URL in `list-tables.ts` diagnostic script |

## Related Documentation

- [DATABASE_SCHEMA_AUDIT.md](./DATABASE_SCHEMA_AUDIT.md)
- [DATABASE_BACKUP_AND_RECOVERY.md](./DATABASE_BACKUP_AND_RECOVERY.md)
- [POSTGRESQL_PRODUCTION_HARDENING_REPORT.md](./POSTGRESQL_PRODUCTION_HARDENING_REPORT.md)
