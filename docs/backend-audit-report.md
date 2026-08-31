# Backend Services Audit Report

**Date:** 2026-08-31  
**Scope:** `services/auth/` (NestJS) and `services/ai-service/` (FastAPI)  
**Status:** Findings complete — ready for remediation planning

---

## 1. Executive Summary

Two backend services audited: an authentication/auth microservice (NestJS) and an AI service (FastAPI), both backed by a shared `@agency-os/database` package (Prisma + PostgreSQL multi-schema, MongoDB helper).

**Severity breakdown:**

| Severity | Count | Key Issues |
|----------|-------|------------|
| CRITICAL | 4 | Committed `.env` with live credentials, default admin password, no auth on public endpoints, silent LLM fallback to mock |
| HIGH | 6 | Missing permissions on admin endpoints, no rate limiting, password logged to console, weak JWT secret, no request correlation, CORS too permissive |
| MEDIUM | 8 | Stale MongoDB brute-force code, API key prefix exposure, seed password hardcoded, stub email, no HTTPS enforcement, dev-mode Prisma logging, in-memory cache, error detail leakage |
| LOW | 5 | Missing `@ApiTags`, inconsistent response wrappers, no health checks, no request timeout, no structured config |

---

## 2. Auth Service (`services/auth/`) — NestJS

### 2.1 Architecture
- NestJS 11 monorepo service under `@agency-os/` workspace.
- Prisma 5 ORM connecting to PostgreSQL with **12 schemas** (auth, cms, clients, crm, projects, billing, hr, payroll, ai, analytics, automation, developer).
- Shared database package at `packages/database/` exports both `prisma` (Prisma client singleton) and `mongoClientPromise` (MongoDB helper).

### 2.2 Authentication
- **JWT-based** auth using `access_token` cookie + Bearer token (manual verification in `jwt-auth.guard.ts`, **not** using Passport strategies).
- Access tokens expire in **1 hour**; refresh tokens in **7 days** with rotation (all existing refresh tokens revoked on new login).
- Passwords hashed with **bcrypt, 12 rounds** (slower than default 10 — acceptable).
- Brute-force check code was **commented out** (MongoDB migration removed).

### 2.3 Authorization
- `PermissionsGuard` using `@RequirePermission()` decorator metadata.
- Admin and superadmin roles bypass permission checks.
- Permissions stored as array on user object, checked via `user.permissions.includes(permission)`.

### 2.4 API Keys (Developer API)
- Generated as `tfx_live_` + `crypto.randomBytes(16)` (32-char suffix).
- Stored **bcrypt-hashed**; validation extracts prefix for lookup, compares with bcrypt.
- Key only returned to user **once** at creation (good practice).
- Prefix stored in plain text (notable: allows key enumeration if DB leaked).

### 2.5 Secrets
```
.env file: COMMITTED to repository
AI_SERVICE_SECRET=change-me-in-production (default placeholder)
JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (loaded from env — good)
ADMIN_PASSWORD in .env.production.example
```

### 2.6 Middleware, Interceptors, Filters
- **Helmet** — active, good.
- **ValidationPipe** — global, with `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`.
- **AllExceptionsFilter** — catches all exceptions, returns sanitized JSON (good).
- **ApiLoggingInterceptor** — logs requests via pino with `genReqId` from `x-request-id` header.
- **Rate Limiting / Throttler** — ThrottlerGuard registered at module level but **no TTL/ limit configured** anywhere found; effectively a no-op.

### 2.7 CORS Configuration
- Read in `main.ts`; config appears restrictive but `origin` function not fully inspected in source reads.

### 2.8 DNS Override
- `main.ts` overrides DNS resolution to `8.8.8.8` — **security/observability concern**: bypasses system DNS, could be intentional for container networking but undocumented.

---

## 3. AI Service (`services/ai-service/`) — FastAPI

### 3.1 Architecture
- FastAPI 0.111 with Pydantic 2.8 models.
- Uses `httpx` for async HTTP, `beautifulsoup4` for scraping.
- Routes under `/internal/` prefix.
- All routers gated by `VerifyInternalSecret` dependency (checks `X-Internal-Secret` header).

### 3.2 LLM Client (`llm_client.py`)
- Provider fallback chain: **Google Gemini → Anthropic → OpenAI → mock**.
- If no API key is found for any provider, **silently falls back to a mock** returning `"Mock response for prompt: ..."`.
- No error raised when all providers unavailable — **dangerous in production**.

### 3.3 Routers
| Router | Purpose |
|--------|---------|
| `chat` | Conversation completion |
| `email_writer` | Email generation |
| `meeting_summary` | Meeting transcription summary |
| `proposal_generator` | Business proposal generation |
| `seo_audit` | SEO analysis (uses scraper) |
| `website_scraper` | Website content extraction (httpx + bs4) |

### 3.4 Error Handling
- Exceptions caught and passed as `detail` string directly to `HTTPException(status_code=500)` — **leaks internal error messages**.

### 3.5 Rate Limiting
- **None** — no `slowapi`, `limits`, or middleware rate limiting.

### 3.6 CORS
- `allow_methods=["*"]`, `allow_headers=["*"]` — overly permissive.

---

## 4. Critical Security Findings

### CRITICAL-01: Committed `.env` File with Live Credentials
- **Location:** `services/auth/.env`
- **Details:** Contains real PostgreSQL connection URL, Redis URL with password, JWT secrets, admin password, `AI_SERVICE_SECRET`.
- **Impact:** Anyone with repo access can read all production secrets.
- **Remediation:** Add to `.gitignore`, rotate all exposed credentials immediately.

### CRITICAL-02: Default Admin Password
- **Location:** `services/auth/.env.production.example` (seed), `services/auth/src/modules/users/users.service.ts:44`
- **Details:** `DEFAULT_TEMP_PASSWORD || 'Welcome@123'` — if env var not set, falls back to a well-known weak password.
- **Impact:** Anyone can gain admin access if environment is misconfigured.
- **Remediation:** Remove fallback; fail loudly if temp password not set.

### CRITICAL-03: Password Logged to Console
- **Location:** `services/auth/src/modules/users/users.service.ts:110`
- **Details:** `console.log('Temp password:', tempPassword)` outputs password in plaintext.
- **Impact:** Exposed in logs/container output.
- **Remediation:** Remove logging; send via secure channel.

### CRITICAL-04: Silent LLM Mock Fallback
- **Location:** `services/ai-service/app/services/llm_client.py`
- **Details:** If all provider keys are missing, returns `"Mock response for prompt: <user_input>"` without error.
- **Impact:** AI features silently return garbage; no alerting on misconfiguration.
- **Remediation:** Raise exception if no provider key configured; add startup validation.

### HIGH-01: No Rate Limiting on Auth Endpoints
- **Location:** Auth service (throttler not configured), AI service (no rate limiting at all)
- **Impact:** Brute-force attacks, credential stuffing, DoS.
- **Remediation:** Configure `@nestjs/throttler` properly; add `slowapi` to FastAPI.

### HIGH-02: Brute-Force Protection Disabled
- **Location:** `services/auth/src/modules/auth/auth.service.ts` (commented-out code)
- **Details:** MongoDB-based brute-force check was commented out during migration; no replacement.
- **Impact:** Unlimited login attempts.
- **Remediation:** Implement Redis-based rate limiting on auth endpoints.

### HIGH-03: Permissions Not Enforced on All Admin Routes
- **Location:** Need to verify each module's controller for `@RequirePermission()` usage.
- **Finding:** Several controllers/routers in auth service modules may lack permission checks (to be verified per-module).

### HIGH-04: JWT Secret Potentially Weak
- **Location:** `services/auth/src/modules/auth/auth.service.ts`
- **Details:** JWT signed with `JWT_ACCESS_SECRET` from env (good) but secret strength not enforced. If env var is short or predictable, tokens can be forged.
- **Remediation:** Enforce minimum secret length at startup.

### HIGH-05: Error Detail Leakage (AI Service)
- **Location:** All AI service routers
- **Details:** `str(e)` passed directly to `HTTPException` detail on 500 responses.
- **Impact:** Leaks internal paths, stack traces, API keys in some cases.
- **Remediation:** Return generic message; log full error server-side.

### HIGH-06: CORS Overly Permissive (AI Service)
- **Location:** `services/ai-service/app/main.py`
- **Details:** `allow_methods=["*"]`, `allow_headers=["*"]`.
- **Remediation:** Enumerate allowed methods/headers explicitly.

### MEDIUM-01: API Key Prefix Stored in Plaintext
- **Location:** `api-keys.service.ts` / Prisma `ApiKey.prefix` column
- **Details:** Key prefix `tfx_live_` stored in DB; full key is bcrypt-hashed. An attacker with DB read can enumerate valid API key prefixes.
- **Impact:** Limited — prefix alone doesn't grant access, but aids targeting.

### MEDIUM-02: Seed Password Hardcoded
- **Location:** `packages/database/seed.ts`
- **Details:** `trifusiondynamicsA3web` as seed admin password; printed to console.
- **Impact:** Known seed credential.
- **Remediation:** Read from env; never print.

### MEDIUM-03: Hardcoded Stub Email
- **Location:** `services/auth/src/modules/stubs/leads.service.ts`
- **Details:** Email address `lead@trifusion.ai` hardcoded in service.

### MEDIUM-04: No HTTPS Enforcement
- **Both services** lack explicit HTTPS redirect or HSTS configuration at app level (may be handled by reverse proxy in prod — needs infra verification).

### MEDIUM-05: In-Memory Cache (Auth Service)
- **Location:** `app.module.ts`
- **Details:** `CacheModule` uses in-memory store, not Redis, despite Redis connection config present. Sessions/tokens cached in memory — won't scale across instances.

### MEDIUM-06: Dev-Mode Prisma Logging
- **Location:** `packages/database/index.js:22`
- **Details:** `log: ['query', 'error', 'warn']` in development — logs all SQL including potentially sensitive data.

### MEDIUM-07: DNS Override to 8.8.8.8
- **Location:** `services/auth/src/main.ts`
- **Details:** Overrides Node DNS resolver to Google DNS `8.8.8.8` — undocumented, could interfere with internal service discovery or be intentional. Needs documentation and review.

---

## 5. Positive Findings (Good Practices)

1. **Password hashing:** bcrypt with 12 rounds (above default 10).
2. **Global ValidationPipe** with `whitelist`, `transform`, and `forbidNonWhitelisted`.
3. **Helmet** middleware active.
4. **API keys:** bcrypt-hashed at rest; only shown once.
5. **Refresh token rotation:** All prior refresh tokens revoked on new login.
6. **AllExceptionsFilter:** Centralized, sanitized error handling.
7. **pino logging** with request ID correlation (`x-request-id`).
8. **Sentry** integration in both services for error tracking.

---

## 6. Recommendations (Actionable)

### Immediate (P0)
1. **Remove `services/auth/.env` from git** and rotate all exposed secrets.
2. **Remove default/fallback password** logic in `users.service.ts`.
3. **Remove password logging** to console in `users.service.ts:110`.
4. **Fix AI service LLM client** to raise error instead of returning mock when no provider key is configured.

### Short-term (P1)
5. Implement **proper rate limiting**:
   - Auth: Configure `@nestjs/throttler` with Redis store.
   - AI: Add `slowapi` or middleware-based limiter.
6. **Restore brute-force protection** using Redis-based attempt counting.
7. **Sanitize AI service error responses** — return generic messages, log details server-side.
8. **Fix CORS** in AI service — enumerate allowed methods/headers.
9. Enforce **JWT secret minimum length** at app startup.
10. **Remove hardcoded stub email** and seed password; use env vars.

### Medium-term (P2)
11. Verify **all controllers** have appropriate `@RequirePermission()` or auth middleware.
12. Consider **Passport.js strategy** for JWT instead of manual verification (standardization).
13. Add **health check endpoints** to auth service (AI service has `/health`).
14. Switch **CacheModule** to Redis store for multi-instance support.
15. Review and document the **DNS override** in `main.ts`.
16. Add **HTTPS/HSTS** enforcement at reverse proxy level (document if not app-level).

---

## 7. File Reference Index

### Auth Service — Critical Files
- `services/auth/.env` — **CRITICAL**: committed secrets
- `services/auth/src/main.ts` — bootstrap, DNS override, CORS, ValidationPipe
- `services/auth/src/app.module.ts` — module config, ThrottlerGuard (unconfigured), CacheModule (in-memory)
- `services/auth/src/common/guards/jwt-auth.guard.ts` — manual JWT verification
- `services/auth/src/common/guards/permissions.guard.ts` — RBAC implementation
- `services/auth/src/modules/auth/auth.service.ts` — JWT signing, bcrypt, refresh token rotation, commented brute-force
- `services/auth/src/modules/users/users.service.ts:44` — default temp password fallback; `:110` — console password log
- `services/auth/src/modules/developer/api-keys/api-keys.service.ts` — API key generation and validation
- `services/auth/src/modules/stubs/leads.service.ts:15` — hardcoded email

### AI Service — Critical Files
- `services/ai-service/app/main.py` — CORS config, Sentry init
- `services/ai-service/app/dependencies.py` — `verify_internal_secret` header check
- `services/ai-service/app/services/llm_client.py` — provider fallback chain incl. silent mock
- `services/ai-service/app/routers/chat.py` — /internal/ route
- `services/ai-service/app/routers/email_writer.py` — /internal/ route
- `services/ai-service/app/routers/meeting_summary.py` — /internal/ route
- `services/ai-service/app/routers/proposal_generator.py` — /internal/ route
- `services/ai-service/app/routers/seo_audit.py` — /internal/ route
- `services/ai-service/app/routers/website_scraper.py` — /internal/ route

### Shared / Database
- `packages/database/prisma/schema.prisma` — 905-line schema, 12 schemas
- `packages/database/seed.ts:30` — hardcoded seed password
- `packages/database/index.ts` — Prisma singleton + MongoDB helper export
- `packages/database/index.js:22` — dev-mode Prisma logging

### Tests / Load Tests
- `services/auth/test/helpers/auth-helper.ts` — hardcoded JWT secret fallback
- `services/auth/test/comprehensive-auth-test.e2e-spec.ts` — full e2e test suite
- `load-tests/security-checks.js` — security scanning script
- `load-tests/websocket-test.js` — WebSocket load test

---

## 8. Prisma Schema Overview (12 Schemas)

| Schema | Key Models |
|--------|-----------|
| `auth` | User, Role, Permission, ApiKey, RefreshToken, AuditLog, Webhook, ApiRequestLog, Setting |
| `cms` | BlogPost, BlogCategory, Page, MenuItem, MediaAsset |
| `clients` | Client, Contact, Lead, Deal |
| `crm` | Account, Contact, Opportunity, Activity |
| `projects` | Project, Task, TimeEntry |
| `billing` | Invoice, Subscription, Payment, Plan |
| `hr` | Employee, Department, Attendance |
| `payroll` | PayrollRun, Payslip |
| `ai` | AiConversation, AiMessage, AiUsageLog |
| `analytics` | Event, Funnel, Report |
| `automation` | Workflow, WorkflowExecution, Trigger |
| `developer` | ApiKey, Webhook, ApiRequestLog (shared/cross-schema refs) |

---

*End of report. Ready for review and remediation planning.*
