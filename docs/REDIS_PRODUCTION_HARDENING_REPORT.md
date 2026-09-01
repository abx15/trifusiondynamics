# Redis Production Hardening Report

**Phase**: Redis Production Hardening  
**Date**: 2026-09-01  
**Repository**: https://github.com/abx15/trifusiondynamics  
**Provider**: Upstash Redis (Redis-compatible, TLS-enabled)  
**Client**: Node.js `redis` v4.7.1

## Executive Summary

This phase hardened the Redis layer for production readiness across safety, reliability, and multi-instance scalability. The application uses Redis for rate limiting (distributed), exchange codes (distributed, single-use), and cache (previously process-local — now Redis-backed). Two `@Cron` jobs previously ran on all instances simultaneously; both now use distributed locks.

**Overall Assessment**: MEDIUM — safe for initial production with remaining items for scale.

### Implemented in This Phase

| Change | Files | Impact |
|--------|-------|--------|
| Redis-backed cache (replaced process-local memory store) | `redis-cache.service.ts`, `app.module.ts` | Cache shared across instances |
| Distributed locks for scheduled jobs | `scheduled-workflows.job.ts`, `rollup.job.ts`, `redis.service.ts` | Prevents duplicate job execution |
| Actual PING health check | `app.controller.ts` | Distinguishes LIVE/READY/DEGRADED |
| Structured key naming | `redis.service.ts` (`redisKey()` helper) | Predictable, namespaced keys |
| Environment isolation in keys | `redis.service.ts` (`REDIS_ENV_PREFIX`) | Prevents cross-env contamination |

### Deferred (P1/P2)

| Change | Rationale |
|--------|-----------|
| User-ID rate limiting for authenticated endpoints | Requires custom ThrottlerGuard key resolver |
| Cache candidates (permissions, org settings) | Requires invalidation strategy design |
| Redis command timeout | Not available in redis v4.7.1 socket options |

---

## 1. Current Redis Architecture

```
Application (NestJS Backend)
├── PrismaService → PostgreSQL (Neon)
├── RedisService (singleton) → Redis (Upstash)
│   ├── Cache        (via CacheManager → RedisCacheService) ← CHANGED from memory
│   ├── Rate Limiting (distributed via RedisThrottlerStorage)
│   ├── Temporary State (exchange codes, TTL'd)
│   └── Locks         (distributed locks for scheduled jobs) ← NEW
└── Scheduled Jobs (process-local @Cron with Redis locks)
    ├── ScheduledWorkflowsJob (every 5 min) ← ADDED distributed lock
    └── RollupJob (daily midnight) ← ADDED distributed lock
```

Three Redis consumers:
- **Cache**: CacheManager backed by `RedisCacheService` (was process-local memory)
- **Rate Limiting**: `RedisThrottlerStorage` (already distributed)
- **Locks**: New `acquireLock`/`releaseLock` methods on `RedisService`
- **Temporary State**: Exchange codes (120s TTL, single-use)

## 2. Redis Clients

| Client | Package | Purpose | Connection |
|--------|---------|---------|------------|
| `redisService` singleton | `redis@4.7.1` | Rate limiting, locks, cache, exchange codes | Via `REDIS_URL` |
| `RedisCacheService` | (wrapper around `redisService`) | CacheManager backend | Via `redisService` |
| `RedisThrottlerStorage` | (uses `redisService`) | NestJS throttler backend | Via `redisService` |

Only one Redis client connection is created (singleton `redisService`). All consumers share this connection.

## 3. In-Memory State Found

| Location | Type | Multi-instance Issue | Resolution |
|----------|------|---------------------|------------|
| `CacheModule.register({ store: 'memory' })` | Process-local cache | Cache not shared; stale data per instance | **FIXED**: Replaced with Redis-backed `RedisCacheService` |
| `RedisThrottlerStorage.fallback` Map | In-memory rate limit | Per-process limits when Redis down | **ACCEPTABLE**: Graceful degradation fallback |
| `New Set(...)` in auth service | Permission deduplication | Per-request, no shared state issue | **OK**: Legitimate local computation |
| `New Map(...)` in payslips/employees | Lookup maps | Per-request, no shared state issue | **OK**: Legitimate local computation |
| `@Cron` jobs (ScheduledWorkflowsJob, RollupJob) | Scheduled execution | Runs on ALL instances | **FIXED**: Added Redis distributed locks |
| `@CacheInterceptor` on stubs controller | Cache | Was process-local | **FIXED**: Now backed by Redis via RedisCacheService |

## 4. Connection Configuration

| Parameter | Value | Status |
|-----------|-------|--------|
| URL | `process.env.REDIS_URL` | ✅ Verified |
| TLS | Via `rediss://` in URL (Upstash default) | ✅ Verified |
| Authentication | Via URL token | ✅ Verified |
| connectTimeout | 5,000 ms | ✅ Configured |
| reconnectStrategy | 10 attempts, capped 2s backoff | ✅ Bounded |
| disableOfflineQueue | true | ✅ Fail-fast |
| commandTimeout | Not configured | ⚠️ Redis v4.7.1 limitation (see §11) |
| Health check (PING) | `redis.ping()` in readiness check | ✅ Added |
| Startup blocking | No (fire-and-forget connect) | ✅ Non-blocking |

## 5. Failure Handling

### Classification

| Operation | Classification | Fallback When Redis Down |
|-----------|----------------|--------------------------|
| Cache `get`/`set` | NON-CRITICAL | Fall back to database query |
| Rate limiting `incr` | SECURITY-SENSITIVE | In-memory Map (per-process) |
| Exchange code `set`/`get` | CRITICAL | In-memory cache → JWT verification |
| Lock `acquire`/`release` | CRITICAL (scheduled jobs) | Lock fails → job skipped |
| Health check `ping` | NON-CRITICAL | Reports `degraded` status |

### Behavior When Redis Is Down

1. **Application starts normally** — Redis connection is fire-and-forget
2. **Health endpoint** (`GET /health/ready`) updates: PING returns false → `redis: 'degraded'` → overall status `degraded`
3. **Cache** — All `get`/`set` return gracefully → application falls through to database
4. **Rate limiting** — In-memory Map provides single-instance protection
5. **Exchange codes** — In-memory cache fallback → JWT fallback as last resort
6. **Scheduled jobs** — Lock acquisition fails → jobs are skipped (no duplicate execution)

### Verified (no crashes)

No `throw` is reached when Redis is unavailable. Every Redis method returns a safe default (`null`, `false`, `undefined`) when `isReady()` is false or when an exception occurs.

## 6. TTL Audit

| Key Pattern | TTL | Purpose | Created In |
|------------|-----|---------|------------|
| `agencyos:<env>:code:<jwt>` | 120s | Exchange code (single-use) | `auth.service.ts:481` |
| `agencyos:<env>:ratelimit:...` | `ttl/1000` seconds (60s) | Rate limit counter | `redis-throttler.storage.ts:39` |
| `agencyos:<env>:lock:job:scheduled_workflows` | 600s | Job lock | `scheduled-workflows.job.ts` |
| `agencyos:<env>:lock:job:analytics_rollup` | 3600s | Job lock | `rollup.job.ts` |
| Cache entries (via RedisCacheService) | Default 300s, or per-call | Cache | `redis-cache.service.ts` |

All temporary keys have explicit TTLs. No keys are created without a TTL.

## 7. Key Naming

**Convention**: `agencyos:<env>:<namespace>:<identifier>`

| Namespace | Purpose | Example |
|-----------|---------|---------|
| `cache:` | Application cache | `agencyos:prod:cache:user:123` |
| `ratelimit:` | Rate limit counters | `agencyos:dev:ratelimit:1.2.3.4` |
| `lock:` | Distributed locks | `agencyos:prod:lock:job:daily_rollup` |
| `otp:` | One-time passwords | `agencyos:prod:otp:user:abc` |
| `session:` | Session state | `agencyos:prod:session:<id>` |
| `code:` | Exchange codes | `agencyos:dev:code:<jwt>` |

**Rules**:
- No raw secrets in keys (only IDs and structured identifiers)
- No unbounded user-controlled segments (all are UUIDs or short strings)
- Environment isolation (`dev` vs `prod`)
- Namespace isolation prevents accidental collisions

## 8. Distributed Rate Limiting

### Current Implementation

| Endpoint | Method | Window | Limit | Key |
|----------|--------|--------|-------|-----|
| `POST /auth/login` | `@Throttle` | 60s | 10 | IP |
| `POST /auth/register` | `@Throttle` | 60s | 5 | IP |
| `POST /auth/refresh` | `@Throttle` | 60s | 30 | IP |
| All endpoints | Default | 60s | 100 | IP |

**Implementation**: `RedisThrottlerStorage` using `INCR` + `EXPIRE` (atomic increment with TTL). In-memory `Map` fallback when Redis is down.

### Recommendations

| Recommendation | Priority | Notes |
|---------------|----------|-------|
| Add user-ID key for authenticated endpoints | P1 | Currently IP-only for all endpoints |
| Add organization-level rate limiting | P2 | Multi-tenant fairness |
| Separate sensitive endpoint limits | P1 | /auth/login needs stricter window |

## 9. Cache Strategy

### What Changed

`CacheModule.register({ store: 'memory', ttl: 300 })` → `RedisCacheService` provider for `CACHE_MANAGER` token.

The `RedisCacheService` class implements the cache-manager `Cache` interface with `get`, `set`, `del`, `has`, `reset`, `keys`, `getMany`, `setMany`, `deleteMany` methods. All delegate to `RedisService` with JSON serialization.

### Current Cache Usage

| Key | Purpose | TTL | Invalidated On |
|-----|---------|-----|----------------|
| `code:<jwt>` | Exchange code (Redis) or cache (memory fallback) | 120s | Single-use (deleted on consume) |

### Proposed Cache Candidates (not yet implemented)

| Key | Purpose | TTL | Risk | Status |
|-----|---------|-----|------|--------|
| `cache:permissions:<userId>` | User permission set | 600s | Authorization staleness | RECOMMENDED |
| `cache:org_settings:<orgId>` | Organization settings | 300s | Config staleness (non-security) | RECOMMENDED |

### Stampede Protection

On cache miss, the application falls through to the database directly. No thundering herd risk because each database query is independent and results are not re-cached in a loop. For high-value cache candidates, a single-flight pattern via distributed lock should be used when implemented.

## 10. Cache Invalidation

| Operation | Invalidation Strategy |
|-----------|----------------------|
| Exchange code consumed | `redis.del('code:<jwt>')` immediately after read |
| Cache miss | Application queries database directly (no cache write-back) |
| Cache set | TTL-based eviction (300s default) |
| Proposed: org update | `redis.del('cache:org_settings:<orgId>')` |
| Proposed: role change | `redis.del('cache:permissions:<userId>')` |

`reset()` is intentionally a no-op in `RedisCacheService` to prevent accidental Redis flush.

## 11. Distributed Locks

### Lock API

```typescript
const token = await this.redis.acquireLock('lock:job:my_job', 300);
if (!token) return; // another instance is running
try { /* critical section */ }
finally { await this.redis.releaseLock('lock:job:my_job', token); }
```

| Method | Redis Command | Properties |
|--------|--------------|------------|
| `acquireLock` | `SET key NX EX ttl` | Atomic, returns token or null |
| `releaseLock` | Lua script: `GET == token ? DEL : 0` | Atomic check-and-delete |

### Lock Usage

| Lock Key | Purpose | TTL | TTL Rationale | Owner |
|----------|---------|-----|---------------|-------|
| `lock:job:scheduled_workflows` | Prevent concurrent workflow cron | 600s | 5-min cron + buffer for long execution | `ScheduledWorkflowsJob` |
| `lock:job:analytics_rollup` | Prevent concurrent daily rollup | 3600s | Daily job, generous TTL for long-running aggregation | `RollupJob` |

### Safety Properties

- Token is unique per caller (`pid:timestamp:random`)
- Release only succeeds if token matches (no lock stealing)
- Lock auto-expires via Redis TTL even if process crashes
- Lock acquisition failure → job is skipped (safe, no duplicate execution)

## 12. Scheduled Job Safety

### Before

```
Instance A → @Cron fires → executes ScheduledWorkflowsJob
Instance B → @Cron fires → executes ScheduledWorkflowsJob
Instance C → @Cron fires → executes ScheduledWorkflowsJob
```

### After

```
Instance A → @Cron fires → acquires Redis lock → executes job → releases lock
Instance B → @Cron fires → lock held by A → skips execution
Instance C → @Cron fires → lock held by A → skips execution
```

| Job | Schedule | Lock | Multi-instance Safe |
|-----|----------|------|---------------------|
| `ScheduledWorkflowsJob` | Every 5 min | `lock:job:scheduled_workflows` (600s TTL) | ✅ Yes |
| `RollupJob` | Daily midnight | `lock:job:analytics_rollup` (3600s TTL) | ✅ Yes |

## 13. Idempotency

| Operation | Idempotent? | Key |
|-----------|-------------|-----|
| Login (token issuance) | Yes (refresh token rotation is atomic) | Token-based |
| Exchange code consume | Yes (single-use, deleted after read) | Code-based |
| Cache set | Yes (last-write wins) | Key-based |
| Rate limit increment | Yes (counter is monotonic) | Key-based |
| Scheduled job with lock | Yes (lock prevents re-entry) | Lock-based |
| Refresh token refresh | Yes (old token deleted before new created) | Token-based (transaction) |

## 14. Memory Safety

### Redis-side (Upstash)
Cannot directly configure `maxmemory` or `eviction policy` — these are managed by the Upstash provider. Verification required in the Upstash console.

**Recommendation**: Configure Upstash with:
- `maxmemory`: Based on plan tier (Upstash manages this)
- Eviction policy: `allkeys-lru` or `allkeys-lfu` for cache data

### Application-side
- All cache entries have TTL (default 300s)
- No unbounded lists, sets, or streams created by the application
- Exchange codes are single-use and explicitly deleted
- Rate limit counters auto-expire via Redis TTL
- Lock keys auto-expire via Redis TTL (no stuck locks)

## 15. Security

| Check | Status |
|-------|--------|
| No credentials in source code | ✅ Uses `REDIS_URL` env var only |
| No credentials in logs | ✅ Only `Redis error: <message>` logged |
| TLS enabled | ✅ Via `rediss://` scheme (Upstash default) |
| Authentication | ✅ Via URL-embedded token |
| Environment isolation | ✅ Key prefix `agencyos:dev:` vs `agencyos:prod:` |
| No sensitive data in keys | ✅ Keys contain IDs only, no tokens or passwords |
| `REDIS_URL` not exposed to clients | ✅ Only used server-side in `RedisService` |

## 16. Health Checks

| Endpoint | Check | Status Mapping |
|----------|-------|----------------|
| `GET /health` | Static — env var presence only | `configured` / `not_configured` |
| `GET /health/live` | None (liveness) | Always `ok` |
| `GET /health/ready` | PostgreSQL `SELECT 1` + Redis `PING` | `ok` / `degraded` / `unavailable` |

**Readiness logic (updated)**:
```
PostgreSQL OK + Redis PING ok → status = ok
PostgreSQL OK + Redis PING fail → status = degraded
PostgreSQL unavailable → status = unavailable
```

Redis is classified as non-critical: its unavailability degrades but does not break the service.

## 17. Monitoring (Recommendations)

The Upstash dashboard provides these metrics. Integrate alerts:

| Metric | Alert Threshold | Notes |
|--------|-----------------|-------|
| Memory usage | > 80% of plan | Risk of eviction |
| Hit rate | < 70% | Cache ineffective |
| Evictions | > 0/min | Memory pressure |
| Command latency | > 1ms avg | Performance issue |
| Connection count | > 80% of plan limit | Scale needed |
| Rejected connections | > 0 | Config issue |
| Key TTL expiry rate | Anomaly detection | Catch misconfigured TTLs |
| Lock acquisition failure rate | > 5% | Job contention |

## 18. Database Separation

| Environment | Redis Config | Key Prefix |
|------------|-------------|------------|
| Production | Separate Upstash Redis DB | `agencyos:prod:` |
| Dev/Staging | Separate Upstash Redis DB | `agencyos:dev:` |
| Development | Same as staging or local Redis | `agencyos:dev:` |
| Testing | Redis skipped (NODE_ENV=test) | N/A |

Key prefixes prevent cross-environment data access even if databases are accidentally shared.

## 19. Queue/BullMQ

No queue system is currently used in the repository. The only reference to queues is a comment in `webhook-dispatcher.service.ts` noting that BullMQ would be used in a future implementation. No action required in this phase.

## 20. Load/Scalability Analysis

### Estimated Redis operations/sec by scenario

| Scenario | Concurrent Users | Est. Redis Ops/sec | Bottleneck |
|----------|-----------------|-------------------|------------|
| Low traffic | 100 | ~50-100 | None |
| Normal | 500 | ~250-500 | None |
| Peak | 1,000 | ~500-1,000 | Rate limit counters |
| High | 5,000 | ~2,500-5,000 | Rate limit + cache |
| Extreme | 10,000 | ~5,000-10,000 | Rate limit counters |

Rate limiting is the highest-volume Redis operation (every request triggers an `INCR`). Cache hits reduce DB load but add Redis reads/writes. Locks are low-frequency (cron jobs only).

### Scaling recommendations
- **Upstash plan**: Scale to Business or Enterprise tier for >1,000 ops/sec
- **Shard rate limit keys**: Consider per-route Redis keys to distribute load
- **Cache TTL tuning**: Use stale-while-revalidate to reduce write amplification

## 21. Files Changed

### Code Changes

1. **`services/auth/src/modules/database/redis.service.ts`** — Added `acquireLock`/`releaseLock` methods (distributed locks), `redisKey()` helper, `REDIS_KEY_PREFIX` with environment isolation, bounded reconnect (already existed), fire-and-forget connect (already existed)
2. **`services/auth/src/modules/database/redis-cache.service.ts`** — NEW: Redis-backed cache implementing CacheManager interface (replaces process-local memory store)
3. **`services/auth/src/modules/database/redis.module.ts`** — Updated to be `@Global()`, provides `RedisService` + `CACHE_MANAGER` (backed by `RedisCacheService`), exports both globally
4. **`services/auth/src/app.module.ts`** — Removed `CacheModule.register({ store: 'memory' })`, now uses global `CACHE_MANAGER` from `RedisModule`
5. **`services/auth/src/modules/automation/jobs/scheduled-workflows.job.ts`** — Added distributed lock acquisition/release around job execution
6. **`services/auth/src/modules/analytics/jobs/rollup.job.ts`** — Added distributed lock acquisition/release
7. **`services/auth/src/app.controller.ts`** — Readiness check now uses actual `redis.ping()` instead of `redis.isReady()`
8. **`services/auth/src/modules/auth/auth.service.ts`** — Updated key naming from `exchange_code:${code}` to `code:${code}` (shorter, uses namespace)

### Documentation

1. **`docs/REDIS_ARCHITECTURE.md`** — NEW: Full architecture audit
2. **`docs/REDIS_OPERATIONS.md`** — NEW: Operations guide for running Redis in production
3. **`docs/REDIS_PRODUCTION_HARDENING_REPORT.md`** — This report

### Tests

1. **`services/auth/src/modules/database/redis.service.spec.ts`** — NEW: 18 tests covering Redis failure scenarios, cache delegation, key naming, rate limit fallback

## 22. Verification Results

### Lint
- `pnpm lint` (root): ✅ 0 errors across all packages
- `pnpm --filter auth lint`: ✅ 0 errors

### Build
- `pnpm --filter auth build`: ✅ Passes

### Tests
- `pnpm --filter auth test`: ✅ 42 tests, 12 suites — all passing
  - 18 new Redis-specific tests added
  - 24 existing tests still pass (no regressions)

### Type Check
- Handled by `nest build` (TypeScript compiler)

## 23. Remaining Risks

### P0 — Critical
(none — all critical Redis issues addressed in this phase)

### P1 — High
1. **User-ID rate limiting for authenticated endpoints** — Currently all rate limits use IP. Authenticated users sharing an IP (e.g., behind NAT) would share rate limits. Requires custom `ThrottlerGuard` with key resolver.
2. **Redis command timeout** — `redis` v4.7.1 doesn't support `socket.commandTimeout`. Commands could hang if Redis is unresponsive but connected. Workaround: upgrade redis package or add application-level timeouts.

### P2 — Medium
1. **Cache candidates** — Permissions, org settings, and role definitions could be cached in Redis but require invalidation strategy design.
2. **Redis memory monitoring** — Upstash dashboard metrics not yet integrated into alerting.
3. **Cross-instance cache invalidation** — Currently each instance updates its own cache independently; consider pub/sub for cache invalidation events.

### P3 — Low
1. **Redis INFO metrics** — Could add `redis.info()` call to health endpoint for additional observability.
2. **Connection pool metrics** — Track connection count via Redis `CLIENT LIST`.

## 24. Next Recommended Phase

### Immediate
1. Verify Upstash Redis configuration in provider console (memory limits, eviction policy, backup settings)
2. Set up monitoring alerts for memory usage, evictions, and hit rate
3. Consider user-ID-based rate limiting for authenticated endpoints

### Short-term (1-2 weeks)
1. Implement cache candidates (permissions, org settings) with invalidation strategy
2. Upgrade `redis` package to v4.18+ for `commandTimeout` support
3. Add Redis `INFO` metrics to health endpoint

### Medium-term (1-2 months)
1. Implement cross-instance cache invalidation via Redis pub/sub
2. Evaluate BullMQ for background job processing of webhooks/workflows
3. Set up Redis metrics in observability platform (Prometheus/Grafana)

---

*Report generated: 2026-09-01*
