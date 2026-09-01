# Redis Architecture & Distributed Rate Limiting

> Date: 2026-09-01
> Scope: `services/auth/src/modules/database/redis.service.ts` and `redis-throttler.storage.ts`
> Status: **VERIFIED** (code in place) · **RECOMMENDED** (provider/runtime configuration)

## 1. Connection behavior

- Client created in `RedisService` constructor from `process.env.REDIS_URL`.
- If `REDIS_URL` is unset, the service logs a warning and operates in **fallback-only** mode.
- In `NODE_ENV=test`, real connections are skipped entirely.
- `connectTimeout: 5000` ms prevents the app from hanging at startup.
- `reconnectStrategy` gives up after **10 attempts** (`attempts > 10 ? false : …`) — no infinite reconnect loops.
- `disableOfflineQueue: true` ensures commands fail fast when disconnected (caller can fall back) instead of buffering.

## 2. Failure behavior

Every public method (`set`, `get`, `del`, `incr`, `ttl`) checks `isReady()` first and returns a safe fallback (`false`, `null`, `undefined`) on failure. **The API never crashes because Redis is down.**

For rate limiting (`RedisThrottlerStorage.increment`):

- Primary: Redis `INCR` + `EXPIRE`.
- If Redis is unavailable, an in-process `Map<key, {count, expiresAt}>` counter is used. This is per-instance only, so under multi-instance load each instance enforces independently — acceptable degradation for an outage window.

## 3. TTL policy

Every temporary key receives a TTL on creation. No key is ever stored without expiry.

| Key pattern                  | TTL              | Purpose                  |
|------------------------------|------------------|--------------------------|
| `agencyos:throttler:<name>:<key>` | per-throttler    | rate limit counter        |
| `agencyos:exchange_code:<code>`  | 120 s          | single-use cross-domain auth exchange code |
| (reserved future: `agencyos:otp:<userId>`, `agencyos:lock:<resource>:<id>`) | per-feature | OTP / distributed lock |

## 4. Distributed rate limiting — endpoints & limits

All limits are enforced via `@nestjs/throttler` with `RedisThrottlerStorage` and apply across **every** backend instance.

| Endpoint                           | Limit (default throttler) | Window | Key basis               |
|------------------------------------|----------------------------|--------|-------------------------|
| All routes (default guard)         | 100 req                    | 60 s   | client IP               |
| `POST /api/auth/login`             | inherited from default +  | 60 s   | client IP               |
| `POST /api/auth/register`          | inherited from default +  | 60 s   | client IP               |
| `POST /api/auth/refresh`           | inherited from default +  | 60 s   | client IP               |
| `POST /api/ai/*`                   | inherited from default    | 60 s   | client IP               |
| `POST /api/ai/chat`                | inherited from default    | 60 s   | client IP               |

The default global guard (`ThrottlerGuard`) is registered as `APP_GUARD`, so every route is rate-limited by default; per-route `@Throttle()` overrides can tighten (or relax) the limit where legitimate UX demands it (none configured yet — recommend tightening auth endpoints separately in a follow-up).

## 5. Key naming convention

All keys are prefixed with `agencyos:` to prevent collisions with anything else that may share the Redis instance.

- `agencyos:throttler:<throttlerName>:<route-or-ip>` — rate limit
- `agencyos:cache:<resource>:<id>` — future-proofed cache namespace (not currently used; fallback to in-memory cache or DB)
- `agencyos:exchange_code:<jwt-code>` — single-use codes
- User input is **never** used to construct arbitrary Redis keys; all key segments are server-controlled constants.

## 6. Security guarantees

- No sensitive permanent data in Redis.
- No secret material in keys (no passwords, no tokens in plaintext, no user emails).
- TTL on every key — Redis can never grow unbounded from these integrations.
- Connection retry is bounded (10 attempts) — no reconnect storm.

## 7. Operational notes

- Set `REDIS_URL` in Render / GitHub Actions before deploying.
- Provision the provider's automated failover / monitoring.
- If Redis is ever down in production, the service stays up but rate-limiting is per-instance — temporary loss of distributed enforcement is preferable to a service outage.