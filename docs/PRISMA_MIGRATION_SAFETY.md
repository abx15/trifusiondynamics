# Prisma Migration Safety

> Date: 2026-08-31
> Status: **RECOMMENDED strategy + script hardening** (no migrations have been generated yet).

## Current state (verified)

- `packages/database/prisma/schema.prisma` exists (12 schemas).
- **No `prisma/migrations/` directory exists** — the project has zero reviewed migrations.
- `packages/database/package.json` defines:
  - `db:push` → `prisma db push`  ← **UNSAFE for production**
  - `db:migrate` → `prisma migrate dev`
  - `db:seed` → `ts-node seed.ts`

Using `prisma db push` in production is dangerous: it applies the schema directly without a
reviewable, versioned migration, can drop columns/data without guardrails, and leaves no audit
trail. The scripts have been hardened below.

## Safe strategy

```
development
   ↓  prisma migrate dev        (creates + applies a named migration locally)
CI validation
   ↓  prisma validate + prisma format + diff check
staging
   ↓  prisma migrate deploy
production
   ↓  prisma migrate deploy     (NEVER db push)
```

## Required one-time setup (run by a maintainer with DB access)

1. Create the baseline migration from the current schema:

   ```bash
   cd packages/database
   npx prisma migrate dev --name init --create-only   # review SQL, then apply on a dev DB
   ```

   If a shadow/production DB already exists with data, use `prisma migrate diff` to generate a
   shadow-db-safe baseline instead of `migrate dev`.

2. Commit the generated `prisma/migrations/**`.

3. In CI/deploy, run `prisma migrate deploy` (idempotent; safe to re-run).

## Script changes made in this phase

`packages/database/package.json`:

- Added `db:migrate:deploy` → `prisma migrate deploy` (the production command).
- Added `db:migrate:dev` → `prisma migrate dev`.
- Renamed the unsafe `db:push` to `db:push:unsafe` so it cannot be triggered by accident in
  production tooling. It remains available for throwaway dev databases only.

## Hard rules

- **Never** run `prisma migrate reset` against production (destroys data).
- **Never** use `prisma db push` against production.
- Do **not** delete or hand-edit existing migration files; add new migrations instead.
- Large/data migrations must be reviewed and tested on staging first.
