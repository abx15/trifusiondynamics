# PostgreSQL Production Hardening Report

**Phase**: PostgreSQL Production Hardening — Implementation Summary  
**Date**: 2026-09-01  
**Repository**: https://github.com/abx15/trifusiondynamics  
**Database**: PostgreSQL 16 on Neon (pooled + direct connections)  
**ORM**: Prisma 5.14 with `multiSchema` preview feature (12 schemas)

## Executive Summary

This phase implemented concrete production safety improvements to the PostgreSQL database layer. All changes were verified via `pnpm lint`, `pnpm build`, and `pnpm test` — zero regressions introduced.

**Overall Assessment**: MEDIUM — safe for initial production with recommended follow-ups for long-term scale.

### Implemented in This Phase

| Category | Change | Files Modified | Risk Mitigated |
|----------|--------|---------------|----------------|
| Connection safety | `connect_timeout=10s`, `statement_timeout=60s`, `idle_in_transaction_session_timeout=60s`, `application_name` | `prisma.service.ts` | Connection exhaustion, runaway queries, pool blocking |
| Transaction safety | Login refresh-token rotation, refresh token rotation, payslip bulk generation | `auth.service.ts`, `payslips.service.ts` | Session loss on partial failures |
| Query safety | `take: 1000` caps on unbounded workflow/payslip fetches | `scheduled-workflows.job.ts`, `payslips.service.ts` | Memory spikes, OOM on cron ticks |
| Index optimization | 8 composite indexes across 6 models | `schema.prisma` + migration | Slow multi-tenant queries at scale |
| Raw SQL safety | Tagged template in `enable_vector.ts`, production guard in `test-schemas.ts`, env-var URL in `list-tables.ts` | 3 diagnostic scripts | SQL injection, accidental destructive runs, credential leaks |
| Credential hygiene | Security warning header + rotation instructions in `.env`; `list-tables.ts` uses env var | `.env`, `list-tables.ts` | Credential exposure |

### Deferred (P1/P2)

| Risk | Decision | Rationale |
|------|----------|-----------|
| Organization → User cascade delete (P0) | Deferred | Requires product decision + zero-downtime migration |
| Organization-scoped unique constraints (P1) | Deferred | Requires data cleanup + business confirmation |
| Missing `@relation` FK declarations (H) | Deferred | Wide schema change requiring migration planning |
| Audit logging table | Deferred | Separate feature; tracked in P2 |
| Soft-delete columns | Deferred | Requires schema + application-wide changes |

---

## 1. Current Database Architecture

### Technology Stack
- **Provider**: Neon PostgreSQL (branch-based dev/test, production on main)
- **ORM**: Prisma 5.14.0
- **Connection URLs**:
  - `DATABASE_URL`: pooled (pgBouncer via Neon pooler)
  - `DIRECT_URL`: direct connection (for migrations and diagnostics)
- **Schema Architecture**: Multi-schema with 12 schemas
- **Migration Strategy**: `prisma migrate deploy` for production

### Schema Organization
```
auth        - Authentication and authorization
cms         - Content management
clients     - Client management
crm         - Customer relationship management
projects    - Project management
billing     - Invoicing and payments
hr          - Human resources
payroll     - Salary and payroll
ai          - AI-powered features
analytics   - Analytics rollups
automation  - Workflow automation
developer   - API keys and webhooks
```

### Application Flow
```
Application (NestJS/Next.js)
    ↓
PrismaService (Singleton, OnModuleInit/OnModuleDestroy)
    ↓
Prisma Client (Connection Pool)
    ↓
Neon PostgreSQL (pgBouncer pooler)
    ↓
PostgreSQL Database
```

---

## 2. Prisma Client Safety

### ✅ Status: SAFE

The `PrismaService` is a proper NestJS `@Injectable()` singleton that implements `OnModuleInit` and `OnModuleDestroy`. It connects once on startup and disconnects on shutdown. No per-request `new PrismaClient()` instances exist in application code.

**New in this phase**: Connection and query timeouts (see §4).

### Lifecycle

```typescript
// prisma.service.ts:50-76
async onModuleInit() {
  await this.$connect();
  // Apply session-level GUCs
  await this.$executeRaw`SET statement_timeout = 60000;`;
  await this.$executeRaw`SET idle_in_transaction_session_timeout = 60000;`;
}
async onModuleDestroy() {
  await this.$disconnect();
}
```

### Standalone Scripts
Three diagnostic scripts in `packages/database/` use `new PrismaClient()` independently — this is expected and safe since they are not long-running services.

---

## 3. Connection Pooling

### ⚠️ Status: NEEDS CAPACITY PLANNING

- **Provider**: Neon with built-in pgbouncer
- **Pool size**: Using Neon defaults (~20 connections)
- **Current usage**: Safe for 2-3 instances at current scale

**Recommendation**: Monitor pool saturation in Neon dashboard; plan for 50-100 connections when scaling to 10+ instances.

---

## 4. Database Timeouts

### ✅ Status: CONFIGURED

**Changes made in `prisma.service.ts`**:

| Timeout | Value | Purpose |
|---------|-------|---------|
| `connect_timeout` | 10 seconds | Prevents indefinite hangs if pooler/network is unreachable |
| `statement_timeout` | 60,000 ms | Aborts any single query running too long |
| `idle_in_transaction_session_timeout` | 60,000 ms | Cancels sessions idle inside a transaction (prevents pool exhaustion) |
| `application_name` | `trifusion-auth-<pid>` | Aids debugging in `pg_stat_activity` |

All timeouts are applied as session-level GUCs via `$executeRaw` in `onModuleInit()`, which means they apply to every connection in the pool after initialization.

---

## 5. Schema Integrity

### ⚠️ Status: WELL-STRUCTURED BUT HAS REFERENTIAL GAPS

**Models Audited**: 40+ across 12 schemas. See [DATABASE_SCHEMA_AUDIT.md](./DATABASE_SCHEMA_AUDIT.md) for the full model-by-model analysis.

Key findings:
- All models use UUID primary keys — good for distributed systems
- Consistent `createdAt`/`updatedAt` timestamps
- **22 models** store `organizationId` as a bare column without `@relation` — PostgreSQL cannot enforce referential integrity for these

**Deferred**: Adding explicit `@relation` declarations is a wide schema change requiring careful migration planning (P2).

---

## 6. Constraints

### ⚠️ Status: SOME ISSUES — DOCUMENTED, DEFERRED

| Unique Constraint | Scope | Issue |
|---|---|---|
| `User.email`, `User.phone` | Global | Correct — auth identity must be unique |
| `Organization.slug` | Global | Correct — subdomain routing |
| `Employee.employeeCode` | **Global** | Should be `(organizationId, employeeCode)` — two orgs may use `TFX-EMP-001` |
| `Invoice.invoiceNumber` | **Global** | Should be `(organizationId, invoiceNumber)` — per-tenant numbering |
| `Estimate.estimateNumber` | **Global** | Same as above |
| `Payslip.(employeeId, month, year)` | Global composite | Correct |
| `ApiKey.hashedKey` | Global | Correct — bcrypt hash |

**All tenant-scoped uniqueness changes deferred** to P1 follow-up requiring data cleanup verification and business sign-off.

---

## 7. Transactions

### ✅ Status: PROPERLY USED

Transactions wrap all multi-step operations that must be atomic:

1. **Registration** (`auth.service.ts:180`) — Organization + User + UserRole + Permission creation
2. **Login** (`auth.service.ts:131`) — Refresh token revocation + new token creation
3. **Refresh** (`auth.service.ts:352`) — Old token deletion + new token creation
4. **Payslip bulk generation** (`payslips.service.ts:31`) — Per-employee: salary structure lookup + payslip creation

**Login and refresh token rotation were wrapped in transactions in this phase** to prevent session loss if the second step fails after the first succeeds.

**Payslip bulk generation**: Each employee's read + write is wrapped in a per-employee `$transaction`. All employees are processed sequentially. This prevents partial payslip creation where a salary structure lookup succeeds but the payslip create fails, leaving the employee without a payslip for that month.

---

## 8. Cascade Delete Safety

### ⚠️ Status: CRITICAL RISK — DOCUMENTED, NOT CHANGED

`User.organization @relation(onDelete: Cascade)` means deleting an Organization hard-deletes all users, refresh tokens, and user roles in a cascade.

**Risk**: Accidental organization deletion = complete data loss for all org members.

**Decision**: Not changed in this phase. Changing cascade behavior is a metadata-only migration (fast), but:
- The application may currently rely on cascade blocking (ProjectMember.userId, Task.assignedToId have no cascade)
- Requires product decision on whether org deletion should be prevented or soft-deleted

**Recommendation**: Implement soft-delete pattern (`isActive` boolean on Organization) in P2.

Full cascade audit: see `docs/DATABASE_SCHEMA_AUDIT.md` §8.

---

## 9. Indexes

### ✅ Status: 8 INDEXES ADDED

**Migration**: `20260901000001_production_hardening_indexes`

| Model | New Composite Index | Query Pattern |
|---|---|---|
| Project | `(organizationId, status, createdAt)` | Active projects list |
| Project | `(organizationId, clientId)` | Projects for a specific client |
| Invoice | `(organizationId, status, createdAt)` | Open invoices list |
| Invoice | `(clientId, status)` | Invoice list per client |
| Task | `(projectId, status, createdAt)` | Tasks per project by status |
| Lead | `(organizationId, stage, createdAt)` | CRM pipeline view |
| Employee | `(organizationId, status, department)` | HR roster view |
| WebhookDelivery | `(webhookId, createdAt)` | Delivery list per webhook |

**Note**: The existing `@@index([organizationId])` on `Project` is now redundant with the composite `(organizationId, status, createdAt)` and `@@index([organizationId, clientId])`. It can be safely dropped in a future migration (low priority — P3). The single-column index is harmless but wastes ~storage and adds minor write overhead.

**Baseline migration**: `20260901000000_init` represents the complete existing schema as a fresh starting point, enabling `prisma migrate deploy` to be used in production for the first time.

---

## 10. Pagination

### ✅ Status: WELL-IMPLEMENTED

A `parsePagination()` utility (`common/utils/pagination.ts`) enforces `MAX_LIMIT = 100` with module-specific overrides (200 for payslips, employees, leaves, recruitment).

**Verified coverage**: automation, webhooks, API keys, users, payslips, leaves, recruitment, AI proposals/audits, request logs.

---

## 11. Sorting Security

### ✅ Status: SAFE

All `orderBy` clauses use hardcoded literal values. No user-controlled input is interpolated into sort fields.

---

## 12. Raw SQL Security

### ✅ Status: SAFE

Five occurrences in the codebase, all reviewed:

1. `app.controller.ts:46` — `$queryRaw\`SELECT 1\`` (health check, safe)
2. `enable_vector.ts:16` — `$executeRaw` tagged template (safe)
3. `list-tables.ts:27` — `$queryRaw` tagged template (safe, now uses env-var URL)
4. `test-schemas.ts:23,29` — `$executeRawUnsafe` with static strings + production guard (safe, destructive only)
5. `apps/agency-web/lib/cms-static-data.ts:340` — inside a markdown comment (not executed)

**Changes in this phase**:
- `list-tables.ts` — removed hardcoded production URL, now reads from `process.env.DATABASE_URL`
- `test-schemas.ts` — added `NODE_ENV === 'production'` guard + `ALLOW_DESTRUCTIVE_SCHEMA_TEST` flag
- `enable_vector.ts` — confirmed using tagged template `$executeRaw\`...\``

---

## 13. Seed Script Safety

### ✅ Status: SAFE

`packages/database/seed.ts` has a production guard:

```typescript
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
  throw new Error('SEED SAFETY: Running seed script in production is disabled by default...');
}
```

Uses environment variables for all credentials.

---

## 14. Test Database Safety

### ✅ Status: SAFE

`services/auth/test/setup.ts` has a production guard:

```typescript
if (process.env.NODE_ENV === 'production') {
  throw new Error('TEST SAFETY: Tests cannot run in production environment...');
}
```

Tests run against a separate database. `prisma migrate reset --force` is scoped to the test DB only.

---

## 15. Migration Strategy

### ✅ Status: CORRECT, INFRASTRUCTURE CREATED

- **Development**: `prisma migrate dev`
- **Production**: `prisma migrate deploy`
- **No `prisma db push` in production workflows**

**New in this phase**:
- Created `packages/database/prisma/migrations/20260901000000_init/migration.sql` — baseline migration representing the complete existing schema (generated via `prisma migrate diff --from-empty`)
- Created `packages/database/prisma/migrations/20260901000001_production_hardening_indexes/migration.sql` — index-only migration for the 8 new composite indexes
- Created `scripts/migrate.sh` — helper script for safe migrations

---

## 16. Backup Strategy

### ⚠️ Status: DOCUMENTED, NEEDS VERIFICATION

Neon provides automated backups. See [DATABASE_BACKUP_AND_RECOVERY.md](./DATABASE_BACKUP_AND_RECOVERY.md) for the full strategy and [RESTORE_PROCEDURE.md](./RESTORE_PROCEDURE.md) for step-by-step runbooks.

**RPO/RTO Targets**:
- **RPO**: 15 minutes (with Neon PITR)
- **RTO**: 1 hour (with documented restore procedures)

**Not verified in Neon console** — requires manual check in the Neon project settings.

---

## 17. Database Monitoring

### ❌ Status: NOT IMPLEMENTED

Recommendations tracked as P2 follow-up:
- Connection count monitoring
- Query latency / slow query logging
- Error rate tracking
- Storage usage monitoring

---

## 18. Files Changed in This Phase

### Code Changes

1. `services/auth/src/modules/database/prisma.service.ts` — Added session-level timeouts and application_name
2. `services/auth/src/modules/auth/auth.service.ts` — Wrapped login and refresh in transactions
3. `services/auth/src/modules/payroll/payslips/payslips.service.ts` — Wrapped generateBulk per-employee in transaction; added take:1000 to findAll
4. `services/auth/src/modules/automation/jobs/scheduled-workflows.job.ts` — Added take:1000 cap
5. `packages/database/list-tables.ts` — Removed hardcoded URL, use env var
6. `packages/database/test-schemas.ts` — Added production guard
7. `packages/database/.env` — Added security warning header with rotation instructions
8. `packages/database/prisma/schema.prisma` — Added 8 composite indexes

### Migration Files

1. `packages/database/prisma/migrations/20260901000000_init/migration.sql` — Baseline schema migration
2. `packages/database/prisma/migrations/20260901000000_init/migration_lock.toml` — Migration lock file
3. `packages/database/prisma/migrations/20260901000001_production_hardening_indexes/migration.sql` — Index migration

### Documentation

1. `docs/RESTORE_PROCEDURE.md` — New: restore runbooks for 4 scenarios
2. `docs/DATABASE_BACKUP_AND_RECOVERY.md` — Updated: restore procedure links, checklist items
3. `docs/DATABASE_SCHEMA_AUDIT.md` — Updated: index inventory, transaction/race-condition sections
4. `docs/HIGH_RISK_QUERY_REPORT.md` — Updated: reflects transaction and pagination fixes
5. `docs/POSTGRESQL_PRODUCTION_HARDENING_REPORT.md` — Updated: comprehensive implementation summary

### Scripts

1. `scripts/migrate.sh` — New: safe migration helper with dry-run and guard

### Frontend Security Hardening (Phase 2)

1. **`apps/admin-dashboard/lib/api-client.ts`** — Removed `localStorage.getItem("accessToken")` fallback (XSS vulnerability); replaced `localStorage.clear()`/`sessionStorage.clear()` with targeted `removeItem()` calls
2. **`apps/admin-dashboard/next.config.ts`** — Added security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy)
3. **`apps/agency-web/next.config.ts`** — Added security headers
4. **`packages/database/check_db.js`** — Added production guard, fixed dotenv path, added `take: 100` cap
5. **`packages/database/test_passwords.js`** — Added production guard, fixed dotenv path
6. **`apps/admin-dashboard/scratch_parse_seed.js`** — Fixed hardcoded Windows path, removed unused import

---

## 19. Testing Results

### Lint
- **Status**: ✅ Passes
- **Errors**: 0

### Build
- **Status**: ✅ Passes (all packages)

### Type Check
- **Status**: ✅ Handled by `nest build` / `tsc --noEmit`

### Tests
- **Status**: ✅ 24 tests, 11 suites — all passing

---

## 20. Remaining Risks

### P0 — Critical
1. **Organization cascade delete** — could cause catastrophic data loss (documented; deferred for product decision)
2. **Credential rotation needed** — `packages/database/.env` contains real production credentials; rotate in Neon console and remove from git history

### P1 — High
1. **Missing FK `@relation` declarations** — 22 models have bare `organizationId` columns; referential integrity not enforced by PostgreSQL
2. **Tenant-scoped unique constraints** — `Employee.employeeCode`, `Invoice.invoiceNumber`, `Estimate.estimateNumber` are globally unique instead of org-scoped
3. **Backup verification** — Neon automated backup/PITR configuration not verified in console
4. **Database monitoring** — no observability stack for connections, slow queries, or errors

### P2 — Medium
1. **Soft delete** — no `isDeleted`/`deletedAt` columns on critical entities
2. **Audit logging** — no dedicated audit table
3. **Connection pool capacity planning** — needs monitoring as instance count scales

### P3 — Low
1. **Redundant single-column index** on `Project(organizationId)` — can be dropped in a future migration

---

## 21. Migration Safety Checklist

Before applying `20260901000001_production_hardening_indexes` to production:

- [x] Migration reviewed — index-only, no schema changes, no data migrations
- [x] Index names are deterministic (`MODEL_col1_col2_idx`)
- [x] No `DROP` or `ALTER TABLE` in the migration (additive only)
- [x] Migration lock file committed and matches `schema.prisma`
- [ ] **Verify in staging**: Apply migration to staging database, run query plan analysis (`EXPLAIN ANALYZE`)
- [ ] **Schedule**: Apply during low-traffic window (index creation blocks writes on Neon)
- [ ] **Monitor**: Watch for lock contention and query plan changes post-migration

---

## Conclusion

The PostgreSQL database layer has been hardened with connection/query timeouts, atomic transactions for session-sensitive operations, composite indexes for common multi-tenant query patterns, and credential-hygiene fixes. The frontend admin dashboard has also been hardened with security headers (CSP, HSTS, X-Frame-Options, etc.) and removal of the localStorage token-storage XSS vector. Migration infrastructure is now in place with a baseline migration and an index migration, plus a runbook for safe production deployments.

The database is **safe for initial production deployment** with the following preconditions:
1. Rotate the credentials found in `packages/database/.env`
2. Verify Neon backup configuration and PITR in the project console
3. Apply the index migration during a low-traffic window
4. Implement the remaining P0/P1 items in the next hardening phase

**Overall Risk Level**: **MEDIUM** — safe for initial production, with remaining items tracked for follow-up.

---

*Report generated: 2026-09-01*
