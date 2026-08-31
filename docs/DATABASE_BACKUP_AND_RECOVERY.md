# Database Backup & Disaster Recovery

> Date: 2026-08-31
> Scope: PostgreSQL (Neon) used by the auth / `@agency-os/database` package.
> Status legend: **VERIFIED** = confirmed in this repo/environment · **RECOMMENDED** = required but not yet configured · **NOT CONFIGURED** = absent.

## 1. Provider

PostgreSQL is hosted on **Neon** (`DATABASE_URL` / `DIRECT_URL` in `.env`). Neon offers
automated backups and point-in-time recovery on its paid tiers. The exact configuration of the
current project could not be verified from the repository, so items below are marked accordingly.

## 2. RPO / RTO targets

| Target | Value | Status |
|--------|-------|--------|
| RPO (Recovery Point Objective) | ≤ 5 minutes (recommended) | **RECOMMENDED** |
| RTO (Recovery Time Objective) | ≤ 30 minutes (recommended) | **RECOMMENDED** |

Set these based on business SLA; Neon PITR granularity depends on the active tier.

## 3. Backup strategy

- **Automated provider backups** — enable Neon's daily logical backups (retained per tier).
  Status: **NOT CONFIGURED / UNVERIFIED** — confirm in Neon console.
- **Point-in-time recovery (PITR)** — strongly recommended for production so a bad migration or
  corrupt write can be rolled back to a safe second. Status: **RECOMMENDED (verify tier)**.
- **Off-site / cross-region copy** — export periodic dumps to a separate bucket/region.
  Status: **NOT CONFIGURED**.
- **Schema + data dump (`pg_dump`)** — add a scheduled job (cron / CI) that dumps the DB and
  pushes to object storage. Status: **NOT CONFIGURED**.

### Recommended dump command (manual / cron)

```bash
# Logical dump of the production database
pg_dump "$DATABASE_URL" --format=custom --no-owner --file="backup-$(date +%F-%H%M).dump"
# Restore example
pg_restore --no-owner --dbname="$DATABASE_URL" backup.dump
```

## 4. Retention

- Daily backups retained **≥ 7 days**, weekly retained **≥ 4 weeks**, monthly retained **≥ 6 months**.
  Status: **RECOMMENDED**.

## 5. Restore testing

- Quarterly restore test into an isolated staging database to validate backup integrity.
  Status: **NOT CONFIGURED**.

## 6. Disaster recovery procedure

1. Detect incident (data corruption, bad migration, provider outage).
2. If PITR is enabled: restore Neon branch to the last known-good timestamp.
3. If only dumps exist: provision a new DB, `pg_restore` the latest verified dump.
4. Update `DATABASE_URL` / `DIRECT_URL` in Render + local env.
5. Rotate credentials (see `docs/SECRET_ROTATION_CHECKLIST.md`) if the incident involved breach.
6. Redeploy / restart services; verify `GET /health/ready`.
7. Communicate status; run post-incident review.

## 7. Production migration safety

- **Never** use `prisma db push` against production (schema-only, no reviewable migration, can
  desync history). Use `prisma migrate deploy` from reviewed migration files.
- See `docs/PRISMA_MIGRATION_SAFETY.md`.

## 8. Current status summary

| Item | Status |
|------|--------|
| Automated backups | NOT CONFIGURED / UNVERIFIED |
| PITR | RECOMMENDED (verify Neon tier) |
| Off-site copy | NOT CONFIGURED |
| Restore testing | NOT CONFIGURED |
| Migration strategy (migrate deploy) | RECOMMENDED (see PRISMA_MIGRATION_SAFETY.md) |
