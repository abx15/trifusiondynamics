import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { redisService } from '../database/redis.service';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Distributed rate-limit storage backed by Redis.
 *
 * - Primary store: Redis (shared across all backend instances).
 * - Fallback: in-memory counter when Redis is unavailable, so rate limiting
 *   still works for a single instance and never crashes the API. The fallback
 *   is per-process and not shared, which is acceptable degradation.
 *
 * NOTE: throttler `ttl` is expressed in MILLISECONDS; Redis TTL is SECONDS.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly fallback = new Map<
    string,
    { count: number; expiresAt: number }
  >();

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storeKey = `${throttlerName}:${key}`;
    const ttlSeconds = Math.max(1, Math.ceil(ttl / 1000));

    const count = await redisService.incr(storeKey, ttlSeconds);
    if (count !== null) {
      const ttlLeft = await redisService.ttl(storeKey);
      const isBlocked = count > limit;
      return {
        totalHits: count,
        timeToExpire: ttlLeft > 0 ? ttlLeft : ttlSeconds,
        isBlocked,
        timeToBlockExpire: isBlocked ? blockDuration : 0,
      };
    }

    // ---- Fallback (Redis unavailable) ----
    const now = Date.now();
    const existing = this.fallback.get(storeKey);
    let newCount: number;
    if (existing && existing.expiresAt > now) {
      newCount = existing.count + 1;
    } else {
      newCount = 1;
    }
    this.fallback.set(storeKey, { count: newCount, expiresAt: now + ttl });
    const isBlocked = newCount > limit;
    return {
      totalHits: newCount,
      timeToExpire: ttlSeconds,
      isBlocked,
      timeToBlockExpire: isBlocked ? blockDuration : 0,
    };
  }
}
