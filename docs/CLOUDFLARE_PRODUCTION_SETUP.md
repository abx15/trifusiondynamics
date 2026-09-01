# Cloudflare Production Edge Security Setup Guide

> **Date**: 2026-09-01
> **Status**: NOT CONFIGURED — Cloudflare has not been provisioned for this zone
> **Provider**: Cloudflare (recommended plan: Pro or Business)
> **Domain**: `trifusiondynamics.com`

---

## Prerequisites

1. **Domain registered** at a registrar that supports CNAME setup at the apex (or use Cloudflare as registrar).
2. **Cloudflare account** with access to the `trifusiondynamics.com` zone.
3. **Vercel domain configured** — Add your custom domain to your Vercel project first (Settings → Domains).
4. **Render custom domain configured** — Add your custom domain to your Render services.
5. **API keys/secrets** ready in environment variables (do NOT paste into chat).

### Production URLs Found in Repository

| Service | Current URL | Target Cloudflare URL |
|---------|-------------|----------------------|
| Agency Web (frontend) | `https://trifusiondynamics.vercel.app` | `https://trifusiondynamics.com` + `www` |
| Admin Dashboard | `https://trifusiondynamicsadmin.vercel.app` | `https://admin.trifusiondynamics.com` |
| Auth API (NestJS) | `https://trifusiondynamics-api.onrender.com` | `https://api.trifusiondynamics.com` |
| AI Service (FastAPI) | `https://trifusiondynamics-ai-api.onrender.com` | `https://ai.trifusiondynamics.com` |
| Health check | `https://trifusiondynamics-api.onrender.com/health` | `https://api.trifusiondynamics.com/health` |

---

## Step 1 — Add Domain to Cloudflare

1. In the Cloudflare dashboard, click **Add a site**.
2. Enter `trifusiondynamics.com` and click **Add site**.
3. Select a plan (Pro or Business recommended for WAF + rate limiting).
4. Cloudflare will scan for existing DNS records. **Keep all existing records** — you will add new ones.

---

## Step 2 — DNS Records

> ⚠️ Before changing DNS records, add the custom domains to Vercel and Render first.
> DNS changes take 24-48 hours to fully propagate. Schedule during low traffic.

### Frontend (Vercel)

| Name | Type | Content | Proxy status | TTL | Purpose |
|------|------|---------|-------------|-----|---------|
| `@` | CNAME | `cname.vercel-dns.com` | Proxied (orange cloud) | Auto | Root domain → Vercel |
| `www` | CNAME | `cname.vercel-dns.com` | Proxied | Auto | www → Vercel |
| `admin` | CNAME | `cname.vercel-dns.com` | Proxied | Auto | Admin dashboard → Vercel |

**Vercel setup**: In Vercel, go to your project Settings → Domains and add:
- `trifusiondynamics.com`
- `www.trifusiondynamics.com`
- `admin.trifusiondynamics.com`

### Backend API (Render)

| Name | Type | Content | Proxy status | TTL | Purpose |
|------|------|---------|-------------|-----|---------|
| `api` | CNAME | `trifusiondynamics-api.onrender.com` | Proxied | Auto | Auth API → Render |
| `ai` | CNAME | `trifusiondynamics-ai-api.onrender.com` | Proxied | Auto | AI service → Render |

**Render setup**: In Render, go to your service Settings → Custom Domains and add:
- `api.trifusiondynamics.com`
- `ai.trifusiondynamics.com`

> **Important**: Set the proxy status to **Proxied** (orange cloud) for ALL records. This ensures all traffic passes through Cloudflare's edge network.

---

## Step 3 — Origin Protection

### Goal
Ensure Render/Vercel origins cannot be accessed directly, bypassing Cloudflare's WAF and rate limiting.

### Render API Origin Protection

**Method**: Cloudflare IP allowlist (on the origin)

1. In Cloudflare dashboard → **Security** → **WAF** → **Tools** → **IP Access Rules**.
2. Note the current Cloudflare IP ranges (see [Cloudflare IP list](https://developers.cloudflare.com/ruleset-engine/rules/ip-sets/)).
3. In Render, update your service to reject requests that do not come from Cloudflare IPs.

**Alternative** (recommended): Use a secret header.

In `main.ts`, add origin verification:

```typescript
const CLOUDFLARE_SECRET_HEADER = process.env.CLOUDFLARE_SECRET_HEADER;

app.use((req, res, next) => {
  if (CLOUDFLARE_SECRET_HEADER) {
    const clientHeader = req.headers['cf-visitor-secret'];
    if (clientHeader !== CLOUDFLARE_SECRET_HEADER) {
      // Only allow from Cloudflare (when header check is enabled)
      // This is supplementary — Cloudflare IP allowlist is the primary method
    }
  }
  next();
});
```

Set `CLOUDFLARE_SECRET_HEADER` in Render environment variables (a long random string).

4. In Cloudflare → **SSL/TLS** → **Edge Certificates** → **Custom hostname** → **Origin Server**, generate an origin certificate for `api.trifusiondynamics.com` and `ai.trifusiondynamics.com`.

### WAF Origin Rule

Create a WAF managed rule modification:
- **Field**: HTTP host
- **Operator**: `eq`
- **Value**: `trifusiondynamics-api.onrender.com` or `trifusiondynamics-ai-api.onrender.com`
- **Action**: Block

This blocks direct access to the Render origin hostname.

---

## Step 4 — SSL/TLS Configuration

### SSL Mode

1. In Cloudflare dashboard → **SSL/TLS** → **Overview**.
2. Set SSL mode to **Full (strict)**.
   - This requires the origin (Render/Vercel) to have a valid TLS certificate.
   - Vercel: automatic HTTPS ✅
   - Render: automatic HTTPS ✅

### Edge Certificates

1. **Edge Certificates** → **Always Use HTTPS** → **On**
2. **Edge Certificates** → **HTTP/2** → **On**
3. **Edge Certificates** → **HTTP/3 (with HTTP/2)** → **On**
4. **Edge Certificates** → **TLS 1.3** → **On**
5. **Edge Certificates** → **Automatic HTTPS Rewrites** → **On**

### HSTS

1. **SSL/TLS** → **Edge Certificates** → **HTTP Strict Transport Security (HSTS)**.
2. Enable with:
   - **Max-Age**: `31536000` (1 year)
   - **Include Subdomains**: Yes
   - **No SNI**: No
   - **Preload**: Yes (only after confirming all subdomains support HTTPS)

> **Warning**: HSTS with preload is irreversible. Enable only after confirming HTTPS works on all subdomains (including `api` and `ai`).

---

## Step 5 — WAF Rules

### 5.1 Managed Rules

1. **Security** → **WAF** → **Managed Rules** → **Managed Rulesets**.
2. Enable the following rulesets:
   - **Cloudflare Managed Rules** — Set to **On** (log all, block critical after testing)
   - **Cloudflare Known Bots** — Set to **On** (allowlist Google, Bing, etc.)
   - **Cloudflare Bot Fight Mode** — Set to **On** (only on Pro/Business)

### 5.2 Custom WAF Rules

Go to **Security** → **WAF** → **Custom Rules** → **Create**.

#### Rule 1: SQL Injection Protection (API)
```
Expression: (http.request.uri.path matches "^/api/" or http.request.uri.path matches "^/auth/") and (http.request.uri.args contains " UNION " or http.request.uri.args contains " SELECT " or http.request.uri.args contains "' OR " or http.request.uri.args contains "'; --" or cf.threat_score > 50)

Action: Block
Description: Block SQL injection attempts on API endpoints
```

#### Rule 2: XSS Protection (API)
```
Expression: (http.request.uri.path matches "^/api/" or http.request.uri.path matches "^/auth/") and (http.request.body contains "<script" or http.request.body contains "javascript:" or http.request.body contains "onerror=")

Action: Block
Description: Block XSS attempts on API endpoints
```

#### Rule 3: Path Traversal
```
Expression: (http.request.uri.path contains "../" or http.request.uri.path contains "..%2f" or http.request.uri.path contains "%2e%2e")

Action: Block
Description: Block path traversal attempts
```

#### Rule 4: Malicious User Agents
```
Expression: not http.user_agent in {"Googlebot", "bingbot", "BingPreview", "Slackbot", "Discordbot"} and (http.request.uri.path matches "^/api/" and (http.user_agent contains "sqlmap" or http.user_agent contains "nikto" or http.user_agent contains "nmap" or http.user_agent contains "masscan" or http.user_agent eq ""))

Action: JS Challenge
Description: Challenge known malicious bots on API endpoints
```

#### Rule 5: Block Access to Render Origin Hostnames
```
Expression: http.host matches "^(trifusiondynamics-api|trifusiondynamics-ai-api)\.onrender\.com$"

Action: Block
Description: Prevent direct access to Render origin hostnames
```

#### Rule 6: Block Access to Vercel Origin Hostnames
```
Expression: http.host matches "^(trifusiondynamics|trifusiondynamicsadmin)\.vercel\.app$"

Action: Block
Description: Prevent direct access to Vercel origin hostnames
```

### 5.3 Managed Rules Fine-Tuning

1. **Security** → **WAF** → **Managed Rules** → **Configuration**.
2. For rule **100311** (WordPress XML-RPC), set to **Disabled** (not applicable).
3. For rule **1000150** (PHP vars), set to **Disabled** (not applicable).
4. Set all other managed rules to **Enabled** with default settings.
5. After 24-48 hours of monitoring, review the **Security Events** tab and tune false positives.

---

## Step 6 — Edge Rate Limiting

### 6.1 Auth Rate Limits

Go to **Security** → **WAF** → **Rate Limiting Rules** → **Create**.

#### Rate Limit 1: Login Endpoint
- **Zone**: `trifusiondynamics.com`
- **Path**: `https://api.trifusiondynamics.com/api/auth/login`
- **Methods**: POST
- **Content type**: application/json
- **Rate limit**: 10 requests per minute
- **Action**: Challenge (JS)
- **Response**: 429 with `Retry-After` header
- **Bypass**: None for this endpoint

> Note: This is a defense-in-depth measure. The application already rate-limits via Redis-backed `RedisThrottlerStorage` (10 req/min for login, 5 req/min for register, 30 req/min for refresh). Cloudflare catches attacks before they reach the origin.

#### Rate Limit 2: Password Reset
- **Path**: `*/auth/change-password*`
- **Methods**: POST
- **Rate limit**: 5 requests per minute
- **Action**: Challenge (JS)

#### Rate Limit 3: Register Endpoint
- **Path**: `https://api.trifusiondynamics.com/api/auth/register`
- **Methods**: POST
- **Rate limit**: 5 requests per minute
- **Action**: Challenge (JS)

### 6.2 AI Service Rate Limits

#### Rate Limit 4: AI Service
- **Path**: `https://ai.trifusiondynamics.com/internal/*`
- **Methods**: POST
- **Rate limit**: 60 requests per minute per IP
- **Action**: Block (429)
- **Bypass**: Allow requests with valid `X-Internal-Secret` header (from auth API)

> The AI service already has in-memory rate limiting (120 req/min per IP). Cloudflare adds a distributed edge limit.

### 6.3 Global API Rate Limit

#### Rate Limit 5: All API Endpoints
- **Path**: `https://api.trifusiondynamics.com/api/*`
- **Methods**: All
- **Rate limit**: 1,000 requests per minute per IP
- **Action**: Challenge (JS)
- **Burst**: Allow 200 burst

---

## Step 7 — DDoS Protection

### Current Plan: Free (assumed)

Free plan includes basic DDoS protection. For production, upgrade to **Pro** or **Business** for:

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Network-level DDoS | ✅ | ✅ | ✅ |
| Application-level DDoS | Limited | ✅ | ✅ |
| Rate limiting rules | 5 | 15 | 15 |
| WAF managed rules | 20 | 25+ | 25+ |
| Bot Fight Mode | ✅ | ✅ | ✅ |
| Bot Management | ❌ | ❌ | ✅ |
| Custom rulesets | 5 | 20 | 20 |

### Configuration

1. **Security** → **DDoS** → **Settings**:
   - Set **Network-based DDoS** to **On**
   - Set **Application DDoS** to **On**
   - Set **I'm Under Attack** mode to **Off** (use only during active attacks)

2. **Security** → **Settings** → **Security Level**:
   - Set to **Medium** (challenge IPs with recent security threats)

---

## Step 8 — Bot Protection

### Configuration

1. **Security** → **Bots** → **Bot Fight Mode** → **On**
2. **Security** → **Bots** → **Known Bots** → **On** (allowlisted Google, Bing, etc.)
3. Do NOT enable **Bot Management** (requires Business plan) unless needed.

### Bot Allowlist

Ensure these are NOT blocked:
- Googlebot, Bingbot, Slackbot, Discordbot (for webhooks)
- API clients (server-to-server from auth service → AI service)

### Webhook Protection

For webhook endpoints (if any are public-facing):
- Do NOT apply browser-specific bot challenges
- Use signature validation instead (already implemented in `webhook-dispatcher.service.ts`)

---

## Step 9 — API Caching

### Policy

**Do NOT cache authenticated responses.** Only cache public, non-sensitive GET responses.

### Caching Rules

Go to **Caching** → **Configuration** → **Create**.

#### Rule 1: Bypass Cache for Auth/API Endpoints
- **When to apply**: URI Path `*/api/*` or URI Path `*/auth/*`
- **Cache Level**: Bypass

#### Rule 2: Cache Public Assets
- **When to apply**: URI Path ends with `.js`, `.css`, `.woff2`, `.woff`, `.ttf`, `.ico`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`
- **Cache Level**: Cache
- **Edge TTL**: 1 month
- **Browser TTL**: 1 month

#### Rule 3: Cache Agency Web Static Data
- **When to apply**: URI Path matches `/_next/static/*`
- **Cache Level**: Cache
- **Edge TTL**: 1 year (immutable)

---

## Step 10 — Static Assets CDN

### Vercel (automatic)

Vercel automatically serves `/_next/static/*` through its own CDN. Cloudflare caches in front of Vercel's CDN for edge locations not served by Vercel.

### Cloudflare Configuration

1. **Caching** → **Configuration** → **Level**: **Standard**
2. **Caching** → **Configuration** → **Browser Cache TTL**: **1 month**
3. **Caching** → **Configuration** → **Always Online**: **On**
4. **Caching** → **Configuration** → **Development Mode**: Off (unless debugging)

### Assets to Cache

| Path Pattern | TTL | Notes |
|-------------|-----|-------|
| `/_next/static/*` | 1 year | Immutable build artifacts |
| `/favicon.ico` | 1 month | Cacheable |
| `/images/*` | 1 month | Cacheable |
| `/fonts/*` | 1 month | Cacheable |
| `/*.css` | 1 month | Cacheable |
| `/*.js` | 1 month | Cacheable (non-module) |

### Assets to NOT Cache

| Path Pattern | Reason |
|-------------|--------|
| `/*` (HTML, except static) | Dynamic pages, may be authenticated |
| `/admin/*` | Authenticated content |
| `/api/*` | API responses, may contain user data |
| `/auth/*` | Authentication endpoints |

---

## Step 11 — Environment Separation

### Production Zone (Recommended)

Use a single zone `trifusiondynamics.com` with different subdomains:

| Environment | Domain | Cloudflare Zone |
|-------------|--------|-----------------|
| Production | `trifusiondynamics.com` | Main zone |
| Staging | `staging.trifusiondynamics.com` | Main zone (separate WAF rules) |
| Development | `dev.trifusiondynamics.com` | Separate zone or no Cloudflare |

### WAF Rule Isolation

Use hostname-based conditions in WAF rules to isolate environments:
```
(http.host eq "api.trifusiondynamics.com") and ...
```

### DNS Isolation

- Do NOT proxy staging/development through Cloudflare on the production zone.
- Use separate zones for non-production environments if needed.

---

## Step 12 — Monitoring & Alerts

### Cloudflare Analytics

Set up notifications in **Notifications** → **Create**:

| Event | Condition | Channel |
|------|----------|---------|
| WAF Events | > 100 events in 5 minutes | Email/Slack |
| Rate Limiting | > 50 matches in 5 minutes | Email/Slack |
| DDoS | Any attack detected | Email/Slack |
| Error Responses | 5xx from origin > 1% | Email/Slack |

### Logs

- Use **Cloudflare Logs** (Enterprise) or **Logpush** if available
- For Pro/Business: Use **Security Events** dashboard
- Integrate with **Sentry** (already configured in the app)

---

## Step 13 — Rollback Procedure

### If WAF blocks legitimate traffic

1. Go to **Security** → **WAF** → **Events**.
2. Find the blocked request.
3. **Disable** or adjust the offending rule.
4. Add WAF-managed-rule bypass for the path if needed.

### If rate limiting blocks legitimate users

1. Go to **Security** → **WAF** → **Rate Limiting Rules**.
2. Find the triggering rule.
3. Increase the limit or add bypass conditions for known IPs.

### If DNS migration fails

1. Go to **DNS** → **Records**.
2. Set proxy status to **DNS only** (grey cloud) for the affected record.
3. Traffic flows directly to origin (bypassing Cloudflare).
4. Fix the Cloudflare configuration.
5. Re-enable proxy (orange cloud).

### If SSL/TLS breaks

1. Go to **SSL/TLS** → **Overview**.
2. Temporarily set SSL mode to **Flexible** (only if origin supports HTTP).
3. Fix origin certificate or Cloudflare configuration.
4. Re-enable **Full (strict)**.

---

## Step 14 — Post-Setup Verification

After Cloudflare is configured, verify:

1. **DNS resolution**:
   ```bash
   dig api.trifusiondynamics.com +short
   # Should return Cloudflare IPs (104.x.x.x or 172.x.x.x)
   ```

2. **SSL certificate**:
   ```bash
   curl -I https://api.trifusiondynamics.com/health
   # Should return 200 and Cloudflare-issued certificate
   ```

3. **Cloudflare headers**:
   ```bash
   curl -I https://api.trifusiondynamics.com/api/auth/login
   # Check for: server: cloudflare, cf-ray: ...
   ```

4. **WAF active**:
   ```bash
   curl "https://api.trifusiondynamics.com/api?q=' OR 1=1--"
   # Should return 403
   ```

5. **Rate limiting active**:
   ```bash
   for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}" https://api.trifusiondynamics.com/api/auth/login; done
   # Should see 429 after limit exceeded
   ```

6. **Origin protection**:
   ```bash
   curl -H "Host: trifusiondynamics-api.onrender.com" https://TRIFUSION_RENDER_IP/api/health
   # Should be blocked (403)
   ```

---

## Step 15 — Recommended Cloudflare Plan

| Feature | Minimum Plan |
|---------|-------------|
| WAF (managed + custom rules) | Pro ($20/mo) |
| Rate limiting rules | Pro ($20/mo) |
| Bot Fight Mode | Free (but limited) |
| Custom SSL | Pro |
| Advanced Certificate Manager | Business ($200/mo) |
| Load Balancing | Business ($200/mo) |
| Logs/Logpush | Enterprise |

**Recommendation**: Start with **Pro** ($20/month). Upgrade to **Business** if:
- You need >20 custom WAF rules
- You need >20 rate limiting rules
- You need custom certificates
- You need load balancing

---

## Next Steps After Cloudflare Setup

1. Update `CORS_ALLOWED_ORIGINS` to the new custom domains
2. Update `COOKIE_DOMAIN` to `.trifusiondynamics.com`
3. Update `NEXT_PUBLIC_API_URL` to `https://api.trifusiondynamics.com/api`
4. Update `NEXT_PUBLIC_ADMIN_DASHBOARD_URL` to `https://admin.trifusiondynamics.com`
5. Update `NEXT_PUBLIC_AGENCY_WEB_URL` to `https://trifusiondynamics.com`
6. Update `NEXT_PUBLIC_AI_SERVICE_URL` to `https://ai.trifusiondynamics.com`
7. Run integration tests against the new endpoints
