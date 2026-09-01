# Cloudflare Edge Security Report

**Phase**: Cloudflare Edge Security Hardening  
**Date**: 2026-09-01  
**Repository**: https://github.com/abx15/trifusiondynamics  
**Domain**: `trifusiondynamics.com` (registered, not yet using Cloudflare)

## 1. Current Architecture

### Deployment Layout

```
                        ┌─────────────────────────────────┐
                        │    CURRENT (no Cloudflare)       │
                        └─────────────────────────────────┘

  Client (Browser)
     │
     ├─ https://trifusiondynamics.vercel.app       (Vercel)
     │   └─ Next.js 15 — agency-web landing site
     ├─ https://trifusiondynamicsadmin.vercel.app  (Vercel)
     │   └─ Next.js 15 — admin dashboard
     └─ API calls from frontend
                              │
     ┌──────────────────────────────────────────────┘
     │
  https://trifusiondynamics-api.onrender.com      (Render)
     └─ NestJS — Auth API (port 8000, /api prefix)
                              │
     ├─ Direct to: trifusiondynamics-ai-api.onrender.com
     │  (FastAPI — AI service, /internal/* prefix, X-Internal-Secret)
     ├─ PostgreSQL (Neon)
     └─ Redis (Render, allkeys-lru)

No intermediate edge layer. All traffic goes directly to Vercel/Render.
```

### Current State

| Aspect | Status |
|--------|--------|
| Cloudflare configured | **NOT CONFIGURED** |
| Custom domain in use | **NOT IN USE** — only platform subdomains |
| WAF | **NOT CONFIGURED** — relies on application-level Helmet.js + CORS |
| DDoS protection | **NOT CONFIGURED** — relies on Render/Vercel platform protection |
| Edge rate limiting | **NOT CONFIGURED** — application-level Redis rate limiting only |
| Origin protection | **NOT CONFIGURED** — origins accessible directly via platform URLs |
| Security headers | **VERIFIED** (in application code via Helmet + Next.js `next.config.ts`) |

### Production URLs Found in Repository

| Service | URL | Origin |
|---------|-----|--------|
| Agency Web | `https://trifusiondynamics.vercel.app` | Vercel |
| Admin Dashboard | `https://trifusiondynamicsadmin.vercel.app` | Vercel |
| Auth API | `https://trifusiondynamics-api.onrender.com/api` | Render |
| AI Service | `https://trifusiondynamics-ai-api.onrender.com` | Render |
| Health Check | `https://trifusiondynamics-api.onrender.com/health` | Render |

### CORS Configuration

**Auth API** (`main.ts:94-118`):
- Reads from `CORS_ALLOWED_ORIGINS` env var
- Production: `https://trifusiondynamics.vercel.app,https://trifusiondynamicsadmin.vercel.app`
- Allows credentials (HttpOnly cookies)
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Request-ID

**AI Service** (`main.py:30-53`):
- Reads from `CORS_ALLOWED_ORIGINS` env var
- Production: `https://trifusiondynamics-api.onrender.com,https://trifusiondynamics.vercel.app,https://trifusiondynamicsadmin.vercel.app`
- Methods: GET, POST, OPTIONS
- Headers: Content-Type, Authorization, X-Internal-Secret, X-Request-ID
- Also has in-memory rate limiting (120 req/min/IP) — **NOT distributed**

## 2. Domain/DNS

### Current State

The project uses **platform subdomains only** — no custom domain is configured for production. The base domain `trifusiondynamics.com` appears in env vars and email addresses but is not actively used as a production domain.

### Cloudflare DNS Plan

> ⚠️ **Cannot implement automatically** — no Cloudflare API credentials available.

| Hostname | Record Type | Target | Proxy | Purpose |
|----------|------------|--------|-------|---------|
| `@` | CNAME | `cname.vercel-dns.com` | Proxied | Root → Vercel |
| `www` | CNAME | `cname.vercel-dns.com` | Proxied | www → Vercel |
| `admin` | CNAME | `cname.vercel-dns.com` | Proxied | Admin → Vercel |
| `api` | CNAME | `trifusiondynamics-api.onrender.com` | Proxied | Auth API → Render |
| `ai` | CNAME | `trifusiondynamics-ai-api.onrender.com` | Proxied | AI → Render |

### DNS Migration Steps
1. Add custom domains to Vercel project Settings
2. Add custom domains to Render services
3. Update `NEXT_PUBLIC_API_URL` to `https://api.trifusiondynamics.com/api`
4. Update `CORS_ALLOWED_ORIGINS` to new domains
5. Update `COOKIE_DOMAIN` to `.trifusiondynamics.com`
6. Schedule DNS cut-over during low traffic

## 3. SSL/TLS

| Setting | Status |
|--------|--------|
| SSL mode | NOT CONFIGURED → Recommend **Full (strict)** |
| Automatic HTTPS Rewrites | NOT CONFIGURED → **On** |
| HTTP/2 | NOT CONFIGURED → **On** |
| HTTP/3 | NOT CONFIGURED → **On** |
| TLS 1.3 | NOT CONFIGURED → **On** |
| HSTS | NOT CONFIGURED → Enable after verifying HTTPS on all subdomains |
| Insecure HTTP | NOT PROXYED → All traffic should go through HTTPS |

Vercel and Render both provide automatic HTTPS on their platform domains. When using custom domains through Cloudflare, **Full (strict)** mode should be used.

## 4. WAF

### Current State
- Application uses **Helmet.js** (`main.ts:76-80`) for basic security headers
- No WAF rules configured at the edge
- No managed rulesets

### WAF Rules Design

**Managed Rulesets** (RECOMMENDED):
| Ruleset | Plan | Action |
|---------|------|--------|
| Cloudflare Managed Rules | Pro+ | On (monitor first, then block) |
| Cloudflare Known Bots | Free | On |
| Cloudflare Bot Fight Mode | Pro | On |

**Custom WAF Rules** (RECOMMENDED):

| Name | Condition | Action | Severity |
|------|-----------|--------|----------|
| SQLi on API | URI matches `/api/` and body contains `UNION SELECT` or `' OR` | Block | High |
| XSS on API | URI matches `/api/` and body contains `<script` or `javascript:` | Block | High |
| Path Traversal | URI contains `../` or `..%2f` | Block | High |
| Malicious User Agents | Known attack tools (sqlmap, nikto, nmap) on `/api/` | JS Challenge | Medium |
| Block Render Origins | Host matches `*.onrender.com` | Block | High |
| Block Vercel Origins | Host matches `*.vercel.app` | Block | Critical |

### WAF Rule Priority

1. **First**: Block direct origin access (Render/Vercel hostnames)
2. **Second**: Managed rules (monitor then block)
3. **Third**: Custom rules (SQLi, XSS, path traversal)
4. **Last**: Bot challenges (low severity)

All WAF rules should be set to **Log** mode initially for 24-48 hours, then switched to blocking after reviewing Security Events.

## 5. DDoS Protection

| Feature | Current | Recommended |
|---------|---------|-------------|
| Network DDoS | Platform-level (Render/Vercel) | **Cloudflare Pro/Business** |
| Application DDoS | Helmet.js + body size limit (5mb) | Cloudflare managed rules |
| `I'm Under Attack` mode | Not available | **Off by default** (manual only during active attacks) |

**Recommendation**: Upgrade to **Pro plan** ($20/month) for:
- 20+ custom WAF rules
- 15 rate limiting rules
- Full managed ruleset
- Bot Fight Mode

Under the Free plan, only basic network-level DDoS is available.

### What Cloudflare Can Absorb

| Attack Type | Cloudflare Protection |
|------------|----------------------|
| Volumetric DDoS | ✅ Network-level |
| Protocol DDoS | ✅ (Pro+) |
| Application DDoS (slowloris, etc.) | ✅ (Pro+ managed rules) |
| Large payload attacks | ✅ + app-level 5mb limit |

### What Still Requires Origin Protection

- Credential stuffing (requires rate limiting + CAPTCHA)
- Authenticated endpoint abuse (requires app-level Redis rate limiting)
- AI token-cost attacks (requires app-level AI rate limiting)

## 6. Edge Rate Limiting

### Complementary to Application Rate Limiting

Rate limiting operates in two layers:

```
Attacker Request
   ↓
Cloudflare Edge Rate Limit  ← Catches floods before they reach origin
   ↓ (passes)
WAF Rules                   ← Filters malicious patterns
   ↓ (passes)
Render API                   ← Application-level Redis rate limiting
```

### Edge Rate Limits

| Endpoint | Edge Limit | App Limit | Action |
|----------|-----------|-----------|--------|
| `POST /api/auth/login` | 10 req/min | 10 req/min (Redis) | JS Challenge (edge) |
| `POST /api/auth/register` | 5 req/min | 5 req/min (Redis) | JS Challenge (edge) |
| `POST /api/auth/refresh` | 30 req/min | 30 req/min (Redis) | JS Challenge (edge) |
| `POST /api/auth/change-password` | 5 req/min | N/A | JS Challenge (edge) |
| `POST /internal/*` (AI) | 60 req/min | 120 req/min (in-memory) | Block (edge) |
| Global `GET /api/*` | 1,000 req/min | N/A | JS Challenge (edge) |

> **Note**: Edge rate limits complement, not replace, application-level rate limits. Application limits are authoritative for authenticated user behavior.

## 7. Bot Protection

| Feature | Current | Recommended |
|---------|---------|-------------|
| Bot Fight Mode | Not configured | **On** (Free+ available) |
| Known Bots | Not configured | **On** |
| Bot Management | Not available | Upgrade to Business if needed |

### Allowlist (do NOT challenge)

| Bot | Purpose | Action |
|-----|---------|--------|
| Googlebot, Bingbot | SEO indexing | Allow |
| Slackbot, Discordbot | Webhook previews | Allow |
| API clients (server-to-server) | Internal AI calls | Allow via `X-Internal-Secret` header |

### Mitigate (challenge)

| Bot Type | Action |
|----------|--------|
| curl/wget without valid headers | JS Challenge |
| Known attack tools (sqlmap, nikto, nmap) | Block |
| Empty user agent on API endpoints | JS Challenge |
| Scrapers hitting `/api/internal/` | Block |

## 8. CDN/Caching

### Current

- Vercel provides CDN for frontend assets (automatic)
- No Cloudflare CDN configured
- API responses are not cached at the edge

### API Caching Strategy

| Path Pattern | Cache Level | TTL | Auth Required? | Rationale |
|-------------|-------------|-----|----------------|-----------|
| `*/api/auth/*` | Bypass | N/A | Yes | Authentication responses must never be cached |
| `*/api/user/*` | Bypass | N/A | Yes | User/profile data is private |
| `*/api/permissions/*` | Bypass | N/A | Yes | Authorization data is security-sensitive |
| `*/api/projects/*` | Bypass | N/A | Yes (per-org) | Organization-specific data |
| `*/api/billing/*` | Bypass | N/A | Yes | Financial data |
| `*/api/ai/*` | Bypass | N/A | Yes | Sensitive AI request/response data |
| `*/cms/*` (stubs) | Cache | 1 hour | No | Public content (FAQ, services, pages) |
| `/_next/static/*` | Cache | 1 year | No | Immutable build artifacts |

### Static Assets

| Path | TTL | Cloudflare Cache |
|------|-----|-----------------|
| `/_next/static/*` | 1 year | Cache everything |
| `/images/*` | 1 month | Cache |
| `/favicon.*` | 1 month | Cache |
| `/*.css` | 1 month | Cache |
| `/*.js` (non-module) | 1 month | Cache |

### Cache Invalidation

- Exchange codes: invalidated on single-use (via `redis.del`)
- Proposed org settings cache: invalidate on `UPDATE organization`
- Proposed permissions cache: invalidate on role/permission changes

## 9. Origin Protection

### Current Risk

Origins are accessible directly via platform URLs:
- `https://trifusiondynamics-api.onrender.com` ← Direct access possible
- `https://trifusiondynamics.vercel.app` ← Direct access possible
- `https://trifusiondynamicsadmin.vercel.app` ← Direct access possible

Attackers can bypass Cloudflare WAF/rate limiting by resolving the origin hostname directly.

### Origin Protection Strategy

| Approach | Status | Notes |
|----------|--------|-------|
| WAF rule blocking origin hostnames | RECOMMENDED | Block `Host: *.onrender.com` and `Host: *.vercel.app` at Cloudflare edge |
| Cloudfront-only IP allowlist (Render) | RECOMMENDED | Configure Render to only accept Cloudflare IP ranges |
| Secret origin header | RECOMMENDED | Add `X-Origin-Secret` validated at the origin layer |
| Cloudflare Tunnel | NOT RECOMMENDED (out of scope) | Would require additional infrastructure |

### Recommended Implementation

1. **WAF Rule**: Block all requests to `*.onrender.com` and `*.vercel.app` hostnames
2. **Render**: Add Cloudflare IP allowlist in Render's network settings (if available)
3. **Application**: Add optional `X-Origin-Secret` header validation (can be enabled in production)

## 10. CORS

### Current CORS Configuration

Auth API (`main.ts:94-118`):
- Production origins: `trifusiondynamics.vercel.app`, `trifusiondynamicsadmin.vercel.app`
- Credentials: true (HttpOnly cookies)
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Request-ID

AI Service (`main.py:30-53`):
- Production origins: `trifusiondynamics-api.onrender.com`, `trifusiondynamics.vercel.app`, `trifusiondynamicsadmin.vercel.app`
- Methods: GET, POST, OPTIONS
- Headers: Content-Type, Authorization, X-Internal-Secret, X-Request-ID

### Cloudflare Interaction

Cloudflare does NOT replace backend CORS. The application must continue enforcing CORS. Cloudflare sits in front of the origin and forwards requests (including cross-origin headers) unchanged.

**Verification checklist after Cloudflare setup**:
- Frontend at `https://trifusiondynamics.com` → API at `https://api.trifusiondynamics.com` — CORS must allow this
- Admin at `https://admin.trifusiondynamics.com` → API at `https://api.trifusiondynamics.com` — CORS must allow this
- AI service internal calls — no CORS needed (server-to-server, uses `X-Internal-Secret`)

## 11. Webhooks

### Webhook Endpoints

| Source | Path | Authentication | Rate Limited |
|--------|------|----------------|--------------|
| Internal (Auth API) | `POST /api/developer/webhooks` | JWT (RolesGuard) | ✅ Yes (global 100/min) |
| External (Webhook Dispatcher) | Outbound to `webhook.url` | HMAC-SHA256 signature | N/A (outbound) |

### Webhook Dispatcher (`webhook-dispatcher.service.ts`)

- Delivers webhooks asynchronously via `fetch()`
- Uses HMAC-SHA256 signature for outbound verification
- Stores delivery records with retry logic
- 2-second timeout, 3 retry attempts

### Cloudflare Considerations

If external webhooks are received at the API:
- Do NOT apply browser bot challenges
- Do NOT apply session-based rate limits
- Use signature validation (HMAC) as the primary auth
- Consider a separate rate limit for webhook endpoints

Currently, no external webhook ingress endpoint exists — webhooks are outbound only.

## 12. AI API Protection

### Current State

The AI service (`services/ai-service`) has:
- All routes under `/internal/` prefix
- Protected by `X-Internal-Secret` header (verified in `dependencies.py`)
- In-memory rate limiting: 120 req/min/IP (NOT distributed)
- No input size validation
- No token-cost tracking

### Threats

| Threat | Mitigation |
|--------|-----------|
| Prompt injection | Application-level — validate inputs |
| Request flooding | Edge rate limit (60/min/IP) + app-level (120/min/IP) |
| Token-cost attacks (oversized prompts) | Edge body size limit + app-level 5mb limit |
| Repeated expensive requests | Application-level rate limiting on auth API before forwarding |

### Recommended Edge Rate Limits

| Endpoint | Edge Limit | Action |
|----------|-----------|--------|
| `https://ai.trifusiondynamics.com/internal/*` | 60 req/min/IP | Block |
| Bypass for requests with valid `X-Internal-Secret` | Unlimited (but app-limited) | — |

### AI Request Flow

```
Client
  ↓ (JWT-authenticated request)
Cloudflare Edge (WAF + Rate Limit)
  ↓
Auth API (NestJS) — validates JWT, enforces Redis rate limit
  ↓ (internal, X-Internal-Secret)
Cloudflare Edge (rate limit for AI)
  ↓
AI Service (FastAPI) — validates internal secret, enforces in-memory rate limit
  ↓
AI Provider (Anthropic/OpenAI/Gemini)
```

## 13. Upload Protection

### Current State

No file upload endpoints found in the current codebase. The frontend hooks (`useClients.ts`, `useLeads.ts`) create/update resources via API but do not upload files.

### Future Considerations

When file upload is implemented:
- Use R2 (object storage) behind Cloudflare
- Add edge body size limits
- Add MIME type validation
- Add virus scanning at the origin
- Never cache uploaded files

## 14. Origin Health

### Health Endpoints

| Service | Path | Response |
|---------|------|----------|
| Auth API | `GET /health` | `{ status: 'ok', checks: { postgres, redis, ai_service } }` |
| Auth API | `GET /health/live` | `{ status: 'ok' }` |
| Auth API | `GET /health/ready` | `{ status, checks }` — checks PostgreSQL + Redis |
| AI Service | `GET /health` | `{ status: 'ok', environment }` |

### Cloudflare Health Checks

**Not implemented** — No Cloudflare Load Balancer or Health Check configured.

**Recommendation**: After setting up Cloudflare:
1. Configure health checks for `https://api.trifusiondynamics.com/health/ready`
2. Configure health checks for `https://ai.trifusiondynamics.com/health`
3. Set up alerts for degraded/unavailable status

### Availability

Currently only single instances on Render (no load balancing). Cloudflare health checks should target:
- Primary: `https://api.trifusiondynamics.com/health/ready`
- Secondary: None (no multi-region setup)

## 15. Observability

### Current Observability

| Component | Monitoring |
|----------|-----------|
| Auth API | Sentry (errors + profiling), pino HTTP logs |
| PostgreSQL | Neon built-in metrics |
| Redis | Render Redis metrics |
| Frontend | Vercel Analytics (implied) |

### Cloudflare Metrics to Monitor (Recommended)

| Metric | Alert Threshold | Source |
|--------|-----------------|--------|
| Blocked requests | > 100 in 5 min | Security Events |
| Rate-limited requests | > 50 in 5 min | Rate Limiting Events |
| WAF matches | > 50 in 5 min | WAF Events |
| 5xx from origin | > 1% of traffic | Analytics |
| cf-ray count | Baseline comparison | Analytics |
| Bot traffic ratio | > 20% non-known | Bots Dashboard |
| SSL/TLS errors | > 0 | SSL/TLS Dashboard |

### Recommended Alerting

Set up alerts in **Notifications**:
1. WAF events > 100 in 5 minutes → email + Slack
2. Rate limit events > 50 in 5 minutes → email + Slack
3. DDoS detected → email + SMS
4. 5xx from origin > 1% → email + Slack
5. Certificate expiring < 7 days → email + Slack

## 16. Environment Separation

### Current State

No Cloudflare zone separation exists. All environments use the same platform URLs.

### Recommended

| Environment | Domain | Cloudflare Zone | WAF Rules |
|-------------|--------|-----------------|-----------|
| Production | `trifusiondynamics.com` | Main zone | Full WAF + rate limits |
| Staging | `staging.trifusiondynamics.com` | Main zone (host-based rules) | Reduced WAF (log only) |
| Development | `dev.trifusiondynamics.com` | Separate zone (no WAF) | No protection (dev only) |
| Testing | Local (localhost) | None | N/A |

### Implementation

1. Create a separate zone for `staging.trifusiondynamics.com` if needed
2. Use hostname conditions in WAF rules to isolate production rules
3. Never run staging traffic through production WAF rules

## 17. Fail-Safe / Rollback

### Failure Modes

| Scenario | Impact | Rollback |
|----------|--------|----------|
| WAF false positive blocks legit traffic | Users can't access API | Disable offending rule in Security → WAF → Events |
| Rate limit too aggressive | Legit users get 429 | Increase limit in Security → WAF → Rate Limiting |
| DNS misconfiguration | Site unreachable | Set proxy to DNS-only (grey cloud) |
| SSL/TLS breaks | HTTPS fails | Temporarily set SSL to "Full" (not strict) |
| Origin protection too strict | Cloudflare blocks legit edge traffic | Temporarily disable origin hostname block rule |
| Cloudflare outage | No traffic reaches origin | Switch DNS to DNS-only (grey cloud) — traffic flows directly to origin |

### Rollback Priority

1. **Immediate**: Set WAF rules to Log mode
2. **Short-term**: Set DNS records to DNS-only (grey cloud) — bypass Cloudflare entirely
3. **Revert DNS**: Point back to platform subdomains (`*.onrender.com`, `*.vercel.app`)

## 18. Cloudflare Configuration Approach

### Infrastructure as Code?

| Option | Status |
|--------|--------|
| `wrangler.toml` | **NOT APPLICABLE** — wrangler is for Workers (not allowed in this phase) |
| Terraform | **RECOMMENDED** — for multi-environment consistency |
| Dashboard-only | **ACCEPTABLE** for initial setup |

### Decision

**Dashboard configuration** is recommended for the initial setup. The configuration is documented in [CLOUDFLARE_PRODUCTION_SETUP.md](./CLOUDFLARE_PRODUCTION_SETUP.md) with exact step-by-step instructions.

If the team wants IaC, a `terraform/` directory can be created in a future phase with `cloudflare` provider configuration.

## 19. Cloudflare API Access

### Status: NOT AVAILABLE

No Cloudflare API credentials or tokens are present in the repository or environment. Configuration must be done via the Cloudflare Dashboard.

**Dashboard configuration steps** are documented in [CLOUDFLARE_PRODUCTION_SETUP.md](./CLOUDFLARE_PRODUCTION_SETUP.md).

## 20. Security Headers Review

### Current (from previous phase — Frontend Security Hardening)

| Header | admin-dashboard | agency-web | Source |
|--------|----------------|------------|--------|
| Content-Security-Policy | ✅ | ✅ | `next.config.ts` |
| X-Frame-Options | ✅ `DENY` | ✅ `DENY` | `next.config.ts` |
| X-Content-Type-Options | ✅ `nosniff` | ✅ `nosniff` | `next.config.ts` |
| Referrer-Policy | ✅ `strict-origin-when-cross-origin` | ✅ | `next.config.ts` |
| Strict-Transport-Security | ✅ | ✅ | `next.config.ts` |
| X-XSS-Protection | ✅ `0` | ✅ `0` | `next.config.ts` |
| Permissions-Policy | ✅ camera=(), microphone=(), geolocation=() | ✅ | `next.config.ts` |

### Cloudflare-Edge Headers (RECOMMENDED)

| Header | Value | Cloudflare Setting |
|--------|-------|-------------------|
| Expect-CT | Report-Only | Security → Edge Certificates |

**No header conflicts** expected. Cloudflare should NOT set security headers that are already set by the application. The application is the single source of truth for security headers. Cloudflare adds `Server: cloudflare` and `CF-RAY` headers (informational, not security-relevant).

## 21. Files Changed

### Code Changes (this phase)
- **None** — All changes are documentation-only. No application code changes were made.

The previous security phases' application changes remain in place:
- `services/auth/src/main.ts` — Helmet.js, CORS whitelist, body size limit
- `services/auth/src/modules/database/redis.service.ts` — Connection timeouts, graceful degradation
- `apps/admin-dashboard/next.config.ts` — Security headers
- `apps/agency-web/next.config.ts` — Security headers
- `apps/admin-dashboard/lib/api-client.ts` — Removed localStorage token storage

### Documentation

1. `docs/CLOUDFLARE_PRODUCTION_SETUP.md` — New: step-by-step dashboard configuration guide
2. `docs/REDIS_ARCHITECTURE.md` — New: Redis architecture audit (from previous phase)
3. `docs/REDIS_OPERATIONS.md` — New: Redis operations guide (from previous phase)
4. `docs/REDIS_PRODUCTION_HARDENING_REPORT.md` — New: Redis hardening report (from previous phase)
5. `docs/POSTGRESQL_PRODUCTION_HARDENING_REPORT.md` — Updated (from previous phase)

## 22. Verification

### Lint
- `pnpm lint`: ✅ 0 errors (auth: 582 warnings, admin-dashboard: 197 warnings)

### Build
- `pnpm --filter auth build`: ✅ Passes
- `pnpm --filter admin-dashboard build`: ✅ Passes
- `pnpm --filter agency-web build`: ✅ Passes

### Tests
- `pnpm --filter auth test`: ✅ 42 tests, 12 suites — all passing

### Type Check
- Handled by `nest build` (TypeScript compiler): ✅ No type errors

## 23. Remaining Risks

### P0 — Critical
(none for Cloudflare phase)

### P1 — High
1. **No custom domain** — Application uses platform subdomains. Must set up custom domain (`trifusiondynamics.com`) and migrate DNS before Cloudflare provides meaningful edge protection
2. **In-memory rate limiting on AI service** — `main.py:55-75` uses a per-process `defaultdict`. In a multi-instance deployment, rate limits are not shared. Consider Redis-backed rate limiting.
3. **Origins accessible directly** — Render (`*.onrender.com`) and Vercel (`*.vercel.app`) URLs can be accessed directly, bypassing any edge protection. Must configure origin hostname blocking.

### P2 — Medium
1. **No Cloudflare API access** — Cannot automate configuration. Must be done manually via dashboard
2. **No Terraform/wrangler configuration** — Configuration drift risk between environments
3. **No load balancing** — Single instance on Render. Cloudflare load balancing not set up.
4. **No health checks in Cloudflare** — No origin health monitoring configured

### P3 — Low
1. **No log streaming** — Cloudflare logs not integrated with existing observability stack
2. **No custom SSL certificate** — Relying on Cloudflare's universal SSL

## 24. Next Recommended Phase

Wait for user instructions. Recommended next phases (in priority order):

1. **Custom domain + Cloudflare DNS migration** — Point `trifusiondynamics.com` DNS to Cloudflare, provision universal SSL, update all application env vars
2. **WAF + rate limiting rollout** — Create Cloudflare WAF rules, enable edge rate limiting, monitor for 48 hours in Log mode
3. **Origin protection** — Block direct access to platform URLs, set up Cloudflare IP allowlist on Render
4. **AI service rate limiting** — Migrate in-memory rate limiter in `main.py` to Redis-backed rate limiting
5. **Infrastructure as Code** — Create `terraform/` directory with Cloudflare provider configuration

**Do NOT** proceed with:
- Cloudflare Workers
- Cloudflare R2
- Cloudflare Queues
- Cloudflare Tunnel (unless origin protection requires it)
- Durable Objects
- Kubernetes
- MongoDB
- Kafka
- ClickHouse

---

*Report generated: 2026-09-01*
