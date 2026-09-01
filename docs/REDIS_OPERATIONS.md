# Redis Operations Guide

> **Date**: 2026-09-01
> **Provider**: Upstash Redis (Redis-compatible, TLS-enabled)
> **Client**: Node.js `redis` v4.7.1
> **Location**: `services/auth/src/modules/database/redis.service.ts`

## 1. Architecture Overview

```
Application (NestJS Backend)
├── PrismaService → PostgreSQL (Neon)
├── RedisService (singleton) → Redis (Upstash)
│   ├── Cache        (via CacheManager → RedisCacheService)
│   ├── Rate Limiting (distributed via RedisThrottlerStorage)
│   ├── Temporary State (exchange codes, OTP tokens)
│   └── Locks         (distributed locks for scheduled jobs)
└── Scheduled Jobs (process-local @Cron with Redis locks)
    ├── ScheduledWorkflowsJob (every 5 min)
    └── RollupJob (daily midnight)
```

See [REDIS_ARCHITECTURE.md](./REDIS_ARCHITECTURE.md) for the full audit.

## 2. Connection Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | Optional | Full Redis connection string with credentials |

When `REDIS_URL` is not set, Redis is disabled and all Redis-dependent features fall back to:
- Cache: process-local memory (CacheManager fallback via auth.service.ts)
- Rate limiting: in-memory Map (per-process, non-distributed)
- Health check: reports `redis: 'degraded'`

### Connection Parameters

| Parameter | Value | Purpose |
|---|---|---|
| `connectTimeout` | 5,000 ms | Prevents indefinite hang on unreachable Redis |
| `reconnectStrategy` | 10 attempts max, capped 2s backoff | Bounded reconnect, no infinite loop |
| `disableOfflineQueue` | true | Fail-fast when disconnected (no command buffering) |
| TLS | Via `rediss://` in REDIS_URL | Upstash enforces TLS |
| Authentication | Via `REDIS_URL` token | Auth is part of the connection string |

### Application Startup

Redis connects asynchronously (fire-and-forget). The application does **not** block startup when Redis is unavailable. Readiness is checked via `GET /health/ready` which performs an actual `PING`.

## 3. Key Naming Convention

```
agencyos:<env>:<namespace>:<identifier>
```

| Part | Values | Example |
|---|---|---|
| `agencyos` | fixed prefix | `agencyos` |
| `<env>` | `dev`, `prod` | `prod` |
| `<namespace>` | `cache`, `ratelimit`, `lock`, `otp`, `session`, `code` | `cache` |
| `<identifier>` | application-specific | `code:abc123` |

### Examples

| Purpose | Key | TTL |
|---|---|---|
| Exchange code | `agencyos:prod:code:<jwt>` | 120s |
| Rate limit counter | `agencyos:dev:ratelimit:1.2.3.4` | 60s (sliding) |
| Scheduled job lock | `agencyos:prod:lock:job:analytics_rollup` | 3600s |
| Cache entry | `agencyos:prod:cache:<key>` | 300s |

### Rules

1. No raw secrets in keys — tokens are values, not keys
2. No unbounded user-controlled segments — all identifiers are UUIDs or short strings
3. Environment isolation — `dev` vs `prod` prefix prevents cross-environment contamination
4. Namespace isolation — `cache:`, `ratelimit:`, `lock:`, etc. prevent accidental collisions

## 4. Rate Limiting

### Configuration

| Endpoint | Window | Limit | Key |
|---|---|---|---|
| `POST /auth/login` | 60s | 10 req | IP (throttler) |
| `POST /auth/register` | 60s | 5 req | IP (throttler) |
| `POST /auth/refresh` | 60s | 30 req | IP (throttler) |
| All endpoints | 60s | 100 req | IP (throttler) |
| Brute-force block | 15 min | 5+ failed | IP (in-code, DB-based) |

### Implementation

- **Primary**: Redis-backed `INCR` with `EXPIRE` via `RedisThrottlerStorage`
- **Fallback**: In-memory `Map` when Redis is unavailable (per-process, not distributed)
- **TTL**: Sliding window — TTL resets on each `INCR` (new keys only)

### Recommendations

- Add user-ID-based rate limiting for authenticated endpoints (currently IP-only)
- Consider organization-level rate limits for multi-tenant fairness
- Monitor `blocked` vs `allowed` ratio for tuning

## 5. Cache Strategy

### Current Cache Usage

The `Cache` interface (via `@nestjs/cache-manager`) is backed by `RedisCacheService` which delegates to `RedisService`.

| Cache Key | Purpose | TTL | Invalidated On |
|---|---|---|---|
| `code:<jwt>` | OAuth exchange code (fallback) | 120s | Single-use (deleted on consume) |

### Proposed Cache Candidates (not yet implemented)

| Cache Key | Purpose | TTL | Risk | Status |
|---|---|---|---|---|
| `cache:permissions:<userId>` | User's permission set | 600s | Authorization stale | RECOMMENDED |
| `cache:org_settings:<orgId>` | Organization settings | 300s | Config stale but non-security | RECOMMENDED |
| `cache:roles` | Global role definitions | 3600s | New roles delayed | RECOMMENDED |

### Cache Invalidation

- **Exchange codes**: Explicitly deleted on consume (`redis.del`)
- **Proposed caches**: Should be invalidated on `UPDATE`/`DELETE` of the underlying entity
- **TTL-based eviction**: Automatic — all keys have TTLs

### Stampede Protection

- For cache misses, the application falls through to the database (no thundering herd for cache misses since each DB query is independent)
- For high-value cache candidates (permissions, org settings), consider single-flight pattern via distributed lock

## 6. Distributed Locks

### Lock API

```typescript
// Acquire — returns token or null if lock is held
const token = await this.redis.acquireLock('lock:job:my_job', 300);
if (!token) return; // another instance is running

try {
  // ... critical section ...
} finally {
  await this.redis.releaseLock('lock:job:my_job', token);
}
```

### Lock Properties

| Property | Implementation |
|---|---|
| **Command** | `SET key token NX EX ttlSeconds` |
| **Release** | Lua script: `GET key == token ? DEL key : 0` (atomic) |
| **Token** | `${pid}:${timestamp}:${random}` (unique per caller) |
| **Safety** | Only releases if token matches (no stealing) |

### Current Lock Usage

| Lock Key | Purpose | TTL | Owner |
|---|---|---|---|
| `lock:job:scheduled_workflows` | Prevent concurrent workflow cron | 600s | `ScheduledWorkflowsJob` |
| `lock:job:analytics_rollup` | Prevent concurrent daily rollup | 3600s | `RollupJob` |

## 7. Failure Handling

### Failure Classification

| Operation | Classification | Fallback When Redis Down |
|---|---|---|
| Cache `get`/`set` | NON-CRITICAL | Fall back to database query |
| Rate limiting `incr` | SECURITY-SENSITIVE | In-memory counter (per-process) |
| Exchange code `set`/`get` | CRITICAL | In-memory cache → JWT verification |
| Lock `acquire`/`release` | CRITICAL (scheduled jobs) | Skip job execution (safe) |
| Health check `ping` | NON-CRITICAL | Report `degraded` status |

### Behavior When Redis Is Down

- Application starts and serves traffic normally
- Health endpoint reports `redis: 'degraded'` but `postgres: 'ok'` → overall status `degraded`
- Cache: all `get`/`set` return `null`/`false` → application falls back to direct database
- Rate limiting: in-memory Map provides single-instance protection
- Scheduled jobs: lock acquisition returns `null` → job is skipped (no duplicate execution)

## 8. Health Check

### Endpoints

| Route | Check | Status Mapping |
|---|---|---|
| `GET /health` | Static — checks env config only | Reports `configured`/`not_configured` |
| `GET /health/live` | None (liveness) | Always `ok` |
| `GET /health/ready` | PostgreSQL `SELECT 1` + Redis `PING` | `ok`/`degraded`/`unavailable` |

### Readiness Logic

```
PostgreSQL OK → Redis OK → status = ok
PostgreSQL OK → Redis Degraded → status = degraded
PostgreSQL Unavailable → status = unavailable
```

Redis is treated as a non-critical dependency — its unavailability degrades but does not break the service.

## 9. Monitoring (Recommendations)

The following metrics should be monitored (via Upstash dashboard or Prometheus):

| Metric | Alert Threshold | Notes |
|---|---|---|
| Memory usage | > 80% of plan limit | Risk of eviction |
| Hit rate | < 70% | Cache ineffective |
| Evictions | > 0/min | Memory pressure |
| Command latency | > 1ms avg | Performance degradation |
| Connection count | Near plan limit | Scale connections |
| Rejected connections | > 0 | Config issue |
| Expired keys/sec | Sudden drop | TTL misbehavior |

## 10. Security

- ✅ No credentials in source code (uses `REDIS_URL` env var)
- ✅ No credentials in logs (only `Redis error: <message>` logged)
- ✅ TLS via `rediss://` scheme (Upstash default)
- ✅ Authentication via URL token
- ✅ Key names contain no secrets (only IDs and prefixes)
- ✅ Environment isolation (`agencyos:dev:` vs `agencyos:prod:`)
- ✅ `commandTimeout` equivalent via bounded operations (note: v4.7.1 limitation)

## 11. Backup & Recovery

Upstash provides automated backups and point-in-time restore. See [DATABASE_BACKUP_AND_RECOVERY.md](../DATABASE_BACKUP_AND_RECOVERY.md) for PostgreSQL backup strategy. Redis backup configuration should be verified separately in the Upstash console.

## 12. Database Separation

| Environment | Redis Config |
|---|---|
| Production | Separate Upstash Redis database (prefix `agencyos:prod:`) |
| Staging | Separate Upstash Redis database (prefix `agencyos:dev:`) |
| Development | Separate Upstash Redis database or local Redis |
| Testing | Redis is skipped (NODE_ENV=test) |

Key prefixes (`agencyos:prod:` vs `agencyos:dev:`) prevent accidental cross-environment data access even if databases are shared.

## 13. Recovery Procedures

### Redis Down

1. Health endpoint reports `degraded` (cache and rate-limit fallbacks active)
2. Cache: application falls through to database — no data loss
3. Rate limiting: operates per-instance via in-memory Map
4. Scheduled jobs: lock acquisition fails → jobs are skipped (safe)
5. Exchange codes: JWT-based fallback works without Redis

### Redis Credentials Compromised

1. Rotate `REDIS_URL` in the deployment platform (Render environment variables)
2. Revoke the old credential in the Upstash console
3. No application code changes required (env var only)

## Related

- [REDIS_ARCHITECTURE.md](./REDIS_ARCHITECTURE.md)
- [DATABASE_BACKUP_AND_RECOVERY.md](./DATABASE_BACKUP_AND_RECOVERY.md)
- [DATABASE_SCHEMA_AUDIT.md](./DATABASE_SCHEMA_AUDIT.md)
- [HIGH_RISK_QUERY_REPORT.md](./HIGH_RISK_QUERY_REPORT.md)
- [POSTGRESQL_PRODUCTION_HARDENING_REPORT.md](./POSTGRESQL_PRODUCTION_HARDENING_REPORT.md)
