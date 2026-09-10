import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import * as crypto from 'crypto';

/**
 * Key namespaces for rate-limit counters. These feed into RedisThrottlerStorage's
 * `ratelimit:` namespace and the dedicated brute-force/login-attempt namespace.
 *
 * Design principles:
 * - Keys are always prefixed with `agencyos:<env>:` (via RedisService.fullKey).
 * - No raw PII in keys — emails are hashed before use.
 * - All keys have explicit TTLs (auto-expire).
 * - Counters are monotonically incremented by Redis `INCR` (atomic).
 *
 * Classification matrix:
 *   CRITICAL path   = auth-sensitive (login, refresh, exchange). Fails CLOSED
 *                     when Redis is down — the caller decides the fallback.
 *   NON-CRITICAL    = all other limits. Fail OPEN (degrade to no-limit) when
 *                     Redis is unavailable so the API stays available.
 */

const LOGIN_WINDOW_SECONDS = 900; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 5; // max failed attempts before lockout
const LOGIN_LOCKOUT_SECONDS = 900; // 15 minute lockout

const EXCHANGE_CODE_LIMIT = 10;
const EXCHANGE_CODE_WINDOW = 60; // 10 attempts per minute per IP

const REFRESH_TOKEN_LIMIT = 30;
const REFRESH_TOKEN_WINDOW = 60; // 30 refresh attempts per minute per token

function hashKey(identifier: string): string {
  return crypto.createHash('sha256').update(identifier).digest('hex');
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Record a failed login attempt for the given email.
   * Returns the resulting attempt count for this window.
   */
  async recordFailedLogin(email: string): Promise<number> {
    const hashed = hashKey(email.toLowerCase().trim());
    const key = `ratelimit:login_fail:${hashed}`;
    const count = await this.redis.incr(key, LOGIN_WINDOW_SECONDS);
    if (count !== null && count === LOGIN_MAX_ATTEMPTS) {
      this.logger.warn(
        `Login brute-force threshold reached for email hash ${hashed.slice(0, 8)}...`,
      );
      await this.redis.set(
        `ratelimit:login_lock:${hashed}`,
        '1',
        LOGIN_LOCKOUT_SECONDS,
      );
    }
    return count ?? 0;
  }

  /**
   * Check if the given email is currently locked out due to excessive
   * failed login attempts.
   * Returns true if locked (should reject login).
   */
  async isLoginLocked(email: string): Promise<boolean> {
    const hashed = hashKey(email.toLowerCase().trim());
    const lockValue = await this.redis.get(`ratelimit:login_lock:${hashed}`);
    return lockValue !== null;
  }

  /**
   * Reset the failed-login counter and lockout for a given email.
   * Called on successful authentication.
   */
  async resetLoginAttempts(email: string): Promise<void> {
    const hashed = hashKey(email.toLowerCase().trim());
    await this.redis.del(`ratelimit:login_fail:${hashed}`);
    await this.redis.del(`ratelimit:login_lock:${hashed}`);
  }

  /**
   * Check and consume a rate-limit slot for a non-critical operation.
   * Fails OPEN — returns `true` (allowed) when Redis is unavailable.
   *
   * @returns {Promise<boolean>} true if the request is allowed
   */
  async checkLimit(
    scope: string,
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const count = await this.redis.incr(
      `ratelimit:${scope}:${identifier}`,
      windowSeconds,
    );
    if (count === null) {
      // Redis unavailable — fail OPEN for non-critical limits
      this.logger.debug(
        `Redis unavailable for rate limit check (${scope}:${identifier}), failing open`,
      );
      return true;
    }
    if (count > limit) {
      this.logger.warn(
        `Rate limit exceeded for scope="${scope}" identifier="${identifier}" count=${count} limit=${limit}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Check and consume a rate-limit slot for a critical (auth-sensitive) operation.
   * Fails CLOSED — returns `false` (blocked) when Redis is unavailable, because
   * we cannot verify the attempt count.
   *
   * @returns {Promise<boolean>} true if the request is allowed
   */
  async checkLimitCritical(
    scope: string,
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const count = await this.redis.incr(
      `ratelimit:${scope}:${identifier}`,
      windowSeconds,
    );
    if (count === null) {
      // Redis unavailable — fail CLOSED for critical limits
      this.logger.warn(
        `Redis unavailable for critical rate limit check (${scope}), failing closed`,
      );
      return false;
    }
    if (count > limit) {
      this.logger.warn(
        `Rate limit exceeded (critical) for scope="${scope}" count=${count} limit=${limit}`,
      );
      return false;
    }
    return true;
  }

  async checkExchangeCodeLimit(ip: string): Promise<boolean> {
    return this.checkLimit(
      'exchange_code',
      ip || 'unknown',
      EXCHANGE_CODE_LIMIT,
      EXCHANGE_CODE_WINDOW,
    );
  }

  async checkRefreshTokenLimit(tokenId: string): Promise<boolean> {
    return this.checkLimitCritical(
      'refresh_token',
      tokenId,
      REFRESH_TOKEN_LIMIT,
      REFRESH_TOKEN_WINDOW,
    );
  }

  /** Exposed for tests. */
  get LOGIN_WINDOW_SECONDS(): number {
    return LOGIN_WINDOW_SECONDS;
  }
  get LOGIN_MAX_ATTEMPTS(): number {
    return LOGIN_MAX_ATTEMPTS;
  }
  get LOGIN_LOCKOUT_SECONDS(): number {
    return LOGIN_LOCKOUT_SECONDS;
  }
}
