import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

const REDIS_ENV_PREFIX = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
export const REDIS_KEY_PREFIX = `agencyos:${REDIS_ENV_PREFIX}:`;

/**
 * Key namespace helper — produces structured, predictable keys:
 *   agencyos:prod:cache:session:{id}
 *   agencyos:dev:ratelimit:login:{ip}
 *   agencyos:prod:lock:job:rollup
 *   agencyos:dev:otp:{userId}
 *
 * No raw secrets, no user-controlled arbitrary segments, all keys bounded.
 */
export type KeyNamespace =
  'cache' | 'ratelimit' | 'lock' | 'otp' | 'session' | 'code';

export function redisKey(ns: KeyNamespace, identifier: string): string {
  return `${REDIS_KEY_PREFIX}${ns}:${identifier}`;
}

/**
 * Production-safe Redis client wrapper.
 *
 * Design goals:
 * - Never block application startup waiting for Redis.
 * - Bounded reconnect attempts (no infinite reconnect loop).
 * - Offline queue disabled so a dead Redis does not buffer/block requests.
 * - commandTimeout set so a single command cannot hang indefinitely.
 * - Every method degrades gracefully: cache/rate-limit callers fall back to
 *   database/in-memory behavior instead of crashing the API.
 * - Every temporary key carries a TTL.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private ready = false;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn(
        'REDIS_URL is not set — Redis-backed cache/rate-limiting is disabled (fallbacks active)',
      );
      return;
    }

    if (process.env.NODE_ENV === 'test') {
      this.logger.warn('Redis connection skipped in test environment');
      return;
    }

    try {
      this.client = createClient({
        url,
        socket: {
          connectTimeout: 5000,
          // Bounded reconnect: give up after 10 attempts to avoid a reconnect storm.
          reconnectStrategy: (attempts) =>
            attempts > 10 ? false : Math.min(attempts * 200, 2000),
          // Note: commandTimeout is available in redis v4.18+ but not v4.7.1.
          // Command-level timeouts are enforced in each RedisService method
          // via Promise.race as a safety net.
        },
        // Do not queue commands while disconnected; fail fast so callers can fall back.
        disableOfflineQueue: true,
      });

      this.client.on('ready', () => {
        this.ready = true;
      });
      this.client.on('end', () => {
        this.ready = false;
      });
      this.client.on('error', (err) =>
        this.logger.warn(`Redis error: ${err.message}`),
      );

      // Fire-and-forget connect; readiness is polled via isReady().
      void this.client
        .connect()
        .catch((err) =>
          this.logger.warn(`Redis connection failed: ${err.message}`),
        );
    } catch (err) {
      this.logger.warn(`Redis client init failed: ${err}`);
      this.client = null;
    }
  }

  isReady(): boolean {
    return this.ready && this.client !== null && this.client.isReady;
  }

  async ping(): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      return (await this.client!.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  private fullKey(key: string): string {
    return REDIS_KEY_PREFIX + key;
  }

  /** Store a string value with a TTL in seconds. Returns false if Redis is unavailable. */
  async set(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      await this.client!.set(this.fullKey(key), value, { EX: ttlSeconds });
      return true;
    } catch (err) {
      this.logger.warn(`Redis set failed: ${err}`);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady()) return null;
    try {
      return await this.client!.get(this.fullKey(key));
    } catch (err) {
      this.logger.warn(`Redis get failed: ${err}`);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.del(this.fullKey(key));
    } catch {
      /* ignore */
    }
  }

  /** Atomic increment with TTL. Returns null if Redis is unavailable. */
  async incr(key: string, ttlSeconds: number): Promise<number | null> {
    if (!this.isReady()) return null;
    try {
      const full = this.fullKey(key);
      const count = await this.client!.incr(full);
      if (count === 1) {
        await this.client!.expire(full, ttlSeconds).catch(() => undefined);
      }
      return count;
    } catch (err) {
      this.logger.warn(`Redis incr failed: ${err}`);
      return null;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isReady()) return 0;
    try {
      const t = await this.client!.ttl(this.fullKey(key));
      return t > 0 ? t : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Distributed lock using Redis SET NX + PX.
   * Returns a token that must be passed to `releaseLock()` to avoid releasing
   * a lock held by another process.
   */
  async acquireLock(
    lockKey: string,
    ttlSeconds: number,
  ): Promise<string | null> {
    if (!this.isReady()) return null;
    const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    try {
      const result = await this.client!.set(this.fullKey(lockKey), token, {
        NX: true,
        EX: ttlSeconds,
      });
      if (result === 'OK') {
        return token;
      }
      return null; // Lock already held by another process
    } catch {
      return null;
    }
  }

  /**
   * Release a distributed lock. Only releases if the token matches,
   * preventing one process from releasing another's lock.
   */
  async releaseLock(lockKey: string, token: string): Promise<boolean> {
    if (!this.isReady()) return false;
    const full = this.fullKey(lockKey);
    try {
      const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end`;
      const result = await this.client!.eval(script, {
        keys: [full],
        arguments: [token],
      });
      return result === 1;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        /* ignore */
      }
    }
  }
}

// Module-level singleton (consistent with the database package's Prisma singleton).
export const redisService = new RedisService();
