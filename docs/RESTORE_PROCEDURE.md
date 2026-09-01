# PostgreSQL Restore Procedure

> **Date**: 2026-09-01
> **Provider**: Neon PostgreSQL
> **Tooling**: `neon` CLI, `pg_restore`, `prisma migrate deploy`

## Prerequisites

```bash
# Install neon CLI
npm install -g neon

# Authenticate
neon login

# Project ID from Neon console
export NEON_PROJECT_ID="your-project-id"
```

---

## Scenario 1: Point-in-Time Recovery (PITR) via Neon Branch

**When**: Accidental data deletion, bad migration, application bug.

### Steps

1. **Identify the recovery point** — find the timestamp just before the incident.
2. **Create a restore branch**:
   ```bash
   neon branches create \
     --project-id $NEON_PROJECT_ID \
     --parent-landing-zone main \
     --name restore-$(date +%Y%m%d-%H%M%S) \
     --point-in-time "2026-09-01T13:45:00Z"
   ```
3. **Wait for branch provisioning** (~10 seconds).
4. **Validate data on the restore branch**:
   ```bash
   # Connect and spot-check
   psql "postgresql://user:pass@restore-branch-name.neon.tech/neondb" -c "SELECT count(*) FROM auth.\"User\" WHERE email = 'victim@example.com';"
   ```
5. **If data is correct, promote**: redirect application traffic to the branch, or use `pg_dump` from the branch into a fresh database.

### RTO: ~5 minutes (branch creation) + validation time.

---

## Scenario 2: Restore from Logical Backup (pg_dump)

**When**: Complete database loss, schema corruption beyond PITR window, or cross-region rebuild.

### Prerequisites

- Latest logical dump file (stored in off-site cold storage — S3/B2 with encryption-at-rest).

### Steps

1. **Create a new Neon project** (or fresh database):
   ```bash
   neon projects create
   ```
2. **Create a new database**:
   ```bash
   neon connection-details --project-id $NEON_PROJECT_ID --branch-name main
   # Note the connection string
   ```
3. **Restore the dump**:
   ```bash
   pg_restore \
     --dbname "postgresql://user:pass@ep-xxx.neon.tech/neondb" \
     --verbose \
     --no-owner \
     --jobs 4 \
     /path/to/backup-20260831.dump
   ```
4. **Run pending migrations** (if the dump was from an older schema):
   ```bash
   npx prisma migrate deploy
   ```
5. **Update application `DATABASE_URL`** to point to the new endpoint.
6. **Smoke test**: verify auth login, a sample query, and webhook delivery.

### RPO: depends on last logical dump (currently not automated — see P2 recommendation).
### RTO: ~30 minutes for sub-100 GB databases.

---

## Scenario 3: Roll Back a Failed Migration

**When**: `prisma migrate deploy` applied a bad migration in production.

### Steps

1. **Check migration status**:
   ```sql
   SELECT * FROM "_prisma_migrations" ORDER BY "finished_at" DESC LIMIT 5;
   ```
2. **If the migration failed before completion**: it is not recorded; no rollback needed.
3. **If the migration succeeded but introduced a bug**:
   - **Option A — Reverse with a new migration**: write a compensating `ALTER TABLE` / `DROP INDEX` in a new migration and deploy it.
   - **Option B — Revert via PITR**: use Scenario 1 to a point before the migration, then re-apply only the safe migrations.
4. **Verify with**:
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

---

## Scenario 4: Test Database Rebuild

**When**: `test/setup.ts` resets the test database (`prisma migrate reset --force`).

### Steps

1. **Set `DATABASE_URL` to test database** (e.g., Neon dev branch).
2. **Run**:
   ```bash
   cd packages/database
   npx prisma migrate reset --force --skip-seed
   npx prisma db seed --preview-feature || true  # optional
   ```
3. **Run tests**:
   ```bash
   cd services/auth
   pnpm test
   ```

---

## Verification Checklist

After any restore:

- [ ] Application connects (`pnpm build` succeeds)
- [ ] Auth flow works (login, token refresh)
- [ ] Critical queries return expected data
- [ ] Migration status is clean (`SELECT COUNT(*) FROM "_prisma_migrations"`)
- [ ] `pgbouncer` pooler connectivity confirmed (if applicable)

---

## Related

- [DATABASE_BACKUP_AND_RECOVERY.md](./DATABASE_BACKUP_AND_RECOVERY.md)
- [DATABASE_SCHEMA_AUDIT.md](./DATABASE_SCHEMA_AUDIT.md)
- [POSTGRESQL_PRODUCTION_HARDENING_REPORT.md](./POSTGRESQL_PRODUCTION_HARDENING_REPORT.md)
