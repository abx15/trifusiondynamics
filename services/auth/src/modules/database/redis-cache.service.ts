import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Redis-backed cache implementation.
 *
 * Replaces `CacheModule.register({ store: 'memory', ... })` which used
 * process-local memory — breaking cache sharing across multiple API instances.
 *
 * All values are JSON-serialized to Redis. TTL is converted from milliseconds
 * (cache-manager API) to seconds (Redis EX).
 */
@Injectable()
export class RedisCacheService {
  private readonly DEFAULT_TTL_SECONDS = 300;
  stores: any[] = [];

  constructor(private readonly redis: RedisService) {}

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(key);
    if (!value) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<T> {
    const ttlSeconds = ttl
      ? Math.max(1, Math.ceil(ttl / 1000))
      : this.DEFAULT_TTL_SECONDS;
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.set(key, strValue, ttlSeconds);
    return value;
  }

  async has(key: string): Promise<boolean> {
    return (await this.redis.get(key)) !== null;
  }

  async del(key: string): Promise<boolean> {
    await this.redis.del(key);
    return true;
  }

  async deleteMany(keys: string[]): Promise<boolean[]> {
    await Promise.all(keys.map((k) => this.redis.del(k)));
    return keys.map(() => true);
  }

  async getMany<T = unknown>(keys: string[]): Promise<Array<T | undefined>> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  async setMany<T = unknown>(
    entries: Array<{ key: string; val: T; ttl?: number }>,
  ): Promise<Array<T | undefined>> {
    await Promise.all(entries.map((e) => this.set(e.key, e.val, e.ttl)));
    return entries.map((e) => e.val);
  }

  async reset(): Promise<void> {
    // Intentionally a no-op. Flushing Redis would destroy all app data.
    // Callers should invalidate individual keys instead.
  }

  async keys<T = unknown>(): Promise<T[]> {
    return [];
  }
}
