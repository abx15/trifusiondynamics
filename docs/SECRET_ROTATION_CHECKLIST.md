# Secret Rotation Checklist

> Date: 2026-08-31
> Trigger: Production credentials were previously committed to the repository.
> Action: Rotate ALL of the following. Treat the old values as compromised.

**NEVER print, log, or commit the new values. Store them only in the secret manager of each
provider (Neon, Redis, Render, Vercel, GitHub Actions).**

## 1. Neon PostgreSQL password

- **Variable:** `DATABASE_URL`, `DIRECT_URL`
- **Service:** auth service, `@agency-os/database` package, seed scripts
- **Currently used:** connection string in Prisma `datasources.db.url` and `DIRECT_URL`
- **Where to rotate:** Neon console → Project → Settings → Database → "Reset password" / rotate
  the role password. Neon will issue a new pooled + direct connection string.
- **Required changes:**
  - Neon: generate new password, copy new connection strings.
  - Render (auth service env): update `DATABASE_URL` + `DIRECT_URL`.
  - Vercel (if any app reads `DATABASE_URL`): update there.
  - GitHub Actions (if any workflow uses it): replace the secret.
  - Local `packages/database/.env` and root `.env`: update.
- **Restart required:** YES — the auth service and any worker must restart to pick up the new
  connection string. Prisma reconnects on next boot.

## 2. Redis password

- **Variable:** `REDIS_URL`
- **Service:** auth service (Redis cache / rate limiting after P1)
- **Currently used:** Redis connection string.
- **Where to rotate:** Redis provider console → "Reset password" / rotate access key.
- **Required changes:** provider rotate → update `REDIS_URL` in Render, GitHub Actions, local.
- **Restart required:** YES — reconnect with the new URL.

## 3. JWT access secret

- **Variable:** `JWT_ACCESS_SECRET`
- **Service:** auth service (token signing/verification)
- **Currently used:** signs access tokens (1h TTL).
- **Where to rotate:** generate a new ≥32-char random value (e.g. `openssl rand -hex 32`).
- **Required changes:** Render auth env, GitHub Actions, local.
- **Restart required:** YES — **all existing access tokens become invalid immediately**;
  users will need to re-authenticate.
- **Note:** P1 added a startup check that fails fast if the secret is missing or < 32 chars.

## 4. JWT refresh secret

- **Variable:** `JWT_REFRESH_SECRET`
- **Service:** auth service (refresh token signing/verification)
- **Currently used:** signs refresh tokens (7d TTL), stored in Postgres `RefreshToken`.
- **Where to rotate:** generate a new ≥32-char random value.
- **Required changes:** Render auth env, GitHub Actions, local.
- **Restart required:** YES — **all existing refresh tokens become invalid**; users re-auth.
  (Outstanding refresh tokens in the DB will fail verification and force re-login — expected.)

## 5. Admin password

- **Variable:** `ADMIN_PASSWORD`
- **Service:** seed script (creates admin/superadmin accounts)
- **Currently used:** bcrypt-hashed admin password at seed time.
- **Where to rotate:** set a new strong value in Render env / local `.env`. Then, because the
  seeded account password only changes on re-seed, also **force a password reset or update the
  admin user directly in the DB** after rotation.
- **Restart required:** NO (only affects future seeds); manual password update required for the
  live admin account.

## 6. AI internal secret (P1 addition)

- **Variable:** `AI_SERVICE_SECRET`
- **Service:** auth service → AI service internal calls; AI service request gate.
- **Currently used:** `X-Internal-Secret` header; AI service rejects requests without it.
- **Where to rotate:** generate a new strong value; set in BOTH Render (auth + ai-service) and
  GitHub Actions.
- **Restart required:** YES for both services.

## Order of operations (recommended)

1. Schedule a maintenance window.
2. Rotate Neon + Redis credentials in providers.
3. Update `AI_SERVICE_SECRET`.
4. Generate new JWT secrets.
5. Update all provider env / secrets managers.
6. Deploy (restart) services.
7. Force admin password reset.
8. Invalidate/rotate any other derived keys (API keys already bcrypt-hashed at rest are fine,
   but rotate if you suspect exposure).

## Verification after rotation

- `GET /health/ready` returns `{ status: "ok" }` (Postgres reachable).
- Auth login works with the new JWT secrets.
- AI service rejects a request without the correct `X-Internal-Secret`.
- No secret values appear in `git log -p` for the cleaned files after the history rewrite.
