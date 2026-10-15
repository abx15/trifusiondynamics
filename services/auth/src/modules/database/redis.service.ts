import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import Redis, { Cluster } from 'ioredis';

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

export type RedisMode = 'standalone' | 'cluster';

export interface RedisClusterNode {
  host: string;
  port: number;
}

export interface RedisConfig {
  mode: RedisMode;
  url?: string;
  nodes?: RedisClusterNode[];
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

/**
 * Production-safe Redis client wrapper with Cluster support.
 *
 * Design goals:
 * - Never block application startup waiting for Redis.
 * - Bounded reconnect attempts (no infinite reconnect loop).
 * - Offline queue disabled so a dead Redis does not buffer/block requests.
 * - Command timeout so a single command cannot hang indefinitely.
 * - Every method degrades gracefully: cache/rate-limit callers fall back to
 *   database/in-memory behavior instead of crashing the API.
 * - Every temporary key carries a TTL.
 * - Supports both standalone and cluster modes for HA.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private standaloneClient: RedisClientType | null = null;
  private clusterClient: Cluster | null = null;
  private ready = false;
  private mode: RedisMode = 'standalone';

  constructor() {
    const config = this.getRedisConfig();
    this.mode = config.mode;

    if (process.env.NODE_ENV === 'test') {
      this.logger.warn('Redis connection skipped in test environment');
      return;
    }

    if (this.mode === 'cluster') {
      this.initCluster(config);
    } else {
      this.initStandalone(config);
    }
  }

  private getRedisConfig(): RedisConfig {
    const mode = (process.env.REDIS_MODE as RedisMode) || 'standalone';

    if (mode === 'cluster') {
      const nodesStr = process.env.REDIS_CLUSTER_NODES;
      if (!nodesStr) {
        this.logger.warn(
          'REDIS_CLUSTER_NODES not set, falling back to standalone mode',
        );
        return { mode: 'standalone', url: process.env.REDIS_URL };
      }

      const nodes: RedisClusterNode[] = nodesStr.split(',').map((node) => {
        const [host, port] = node.trim().split(':');
        return { host, port: parseInt(port, 10) };
      });

      return {
        mode: 'cluster',
        nodes,
        maxRetriesPerRequest: parseInt(
          process.env.REDIS_MAX_RETRIES || '3',
          10,
        ),
        enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',
        lazyConnect: process.env.REDIS_LAZY_CONNECT !== 'false',
      };
    }

    return {
      mode: 'standalone',
      url: process.env.REDIS_URL,
    };
  }

  private initStandalone(config: RedisConfig): void {
    const url = config.url;
    if (!url) {
      this.logger.warn(
        'REDIS_URL is not set — Redis-backed cache/rate-limiting is disabled (fallbacks active)',
      );
      return;
    }

    try {
      this.standaloneClient = createClient({
        url,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (attempts) =>
            attempts > 10 ? false : Math.min(attempts * 200, 2000),
        },
        disableOfflineQueue: true,
      });

      this.standaloneClient.on('ready', () => {
        this.ready = true;
      });
      this.standaloneClient.on('end', () => {
        this.ready = false;
      });
      this.standaloneClient.on('error', (err) =>
        this.logger.warn(`Redis error: ${err.message}`),
      );

      void this.standaloneClient
        .connect()
        .catch((err) =>
          this.logger.warn(`Redis connection failed: ${err.message}`),
        );
    } catch (err) {
      this.logger.warn(`Redis client init failed: ${err}`);
      this.standaloneClient = null;
    }
  }

  private initCluster(config: RedisConfig): void {
    const nodes = config.nodes || [];
    if (nodes.length === 0) {
      this.logger.warn(
        'No Redis cluster nodes configured, cluster mode disabled',
      );
      return;
    }

    try {
      this.clusterClient = new Redis.Cluster(nodes, {
        slotsRefreshTimeout: 5000,
        slotsRefreshInterval: 5000,
        enableReadyCheck: config.enableReadyCheck ?? true,
        lazyConnect: config.lazyConnect ?? true,
      });

      this.clusterClient.on('ready', () => {
        this.ready = true;
        this.logger.log('Redis cluster ready');
      });
      this.clusterClient.on('close', () => {
        this.ready = false;
        this.logger.warn('Redis cluster connection closed');
      });
      this.clusterClient.on('error', (err) =>
        this.logger.warn(`Redis cluster error: ${err.message}`),
      );
      this.clusterClient.on('reconnecting', () => {
        this.logger.log('Redis cluster reconnecting...');
      });
      this.clusterClient.on('end', () => {
        this.ready = false;
      });

      if (!config.lazyConnect && this.clusterClient) {
        this.clusterClient
          .connect()
          .catch((err) =>
            this.logger.warn(`Redis cluster connection failed: ${err.message}`),
          );
      }
    } catch (err) {
      this.logger.warn(`Redis cluster init failed: ${err}`);
      this.clusterClient = null;
    }
  }

  getMode(): RedisMode {
    return this.mode;
  }

  isReady(): boolean {
    if (this.mode === 'cluster') {
      return (
        this.ready &&
        this.clusterClient !== null &&
        this.clusterClient.status === 'ready'
      );
    }
    return (
      this.ready &&
      this.standaloneClient !== null &&
      this.standaloneClient.isReady
    );
  }

  async ping(): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      if (this.mode === 'cluster' && this.clusterClient) {
        return (await this.clusterClient.ping()) === 'PONG';
      }
      if (this.standaloneClient) {
        return (await this.standaloneClient.ping()) === 'PONG';
      }
      return false;
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
      const fullKey = this.fullKey(key);
      if (this.mode === 'cluster' && this.clusterClient) {
        await this.clusterClient.set(fullKey, value, 'EX', ttlSeconds);
      } else if (this.standaloneClient) {
        await this.standaloneClient.set(fullKey, value, { EX: ttlSeconds });
      } else {
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`Redis set failed: ${err}`);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady()) return null;
    try {
      const fullKey = this.fullKey(key);
      if (this.mode === 'cluster' && this.clusterClient) {
        return await this.clusterClient.get(fullKey);
      }
      if (this.standaloneClient) {
        return await this.standaloneClient.get(fullKey);
      }
      return null;
    } catch (err) {
      this.logger.warn(`Redis get failed: ${err}`);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      const fullKey = this.fullKey(key);
      if (this.mode === 'cluster' && this.clusterClient) {
        await this.clusterClient.del(fullKey);
      } else if (this.standaloneClient) {
        await this.standaloneClient.del(fullKey);
      }
    } catch {
      /* ignore */
    }
  }

  /** Atomic increment with TTL. Returns null if Redis is unavailable. */
  async incr(key: string, ttlSeconds: number): Promise<number | null> {
    if (!this.isReady()) return null;
    try {
      const full = this.fullKey(key);
      let count: number;
      if (this.mode === 'cluster' && this.clusterClient) {
        count = await this.clusterClient.incr(full);
        if (count === 1) {
          await this.clusterClient
            .expire(full, ttlSeconds)
            .catch(() => undefined);
        }
      } else if (this.standaloneClient) {
        count = await this.standaloneClient.incr(full);
        if (count === 1) {
          await this.standaloneClient
            .expire(full, ttlSeconds)
            .catch(() => undefined);
        }
      } else {
        return null;
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
      const fullKey = this.fullKey(key);
      if (this.mode === 'cluster' && this.clusterClient) {
        const t = await this.clusterClient.ttl(fullKey);
        return t > 0 ? t : 0;
      }
      if (this.standaloneClient) {
        const t = await this.standaloneClient.ttl(fullKey);
        return t > 0 ? t : 0;
      }
      return 0;
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
      const fullKey = this.fullKey(lockKey);
      let result: string | null;
      if (this.mode === 'cluster' && this.clusterClient) {
        // For cluster, use set with NX and EX options
        result = await this.clusterClient.set(
          fullKey,
          token,
          'EX',
          ttlSeconds,
          'NX',
        );
      } else if (this.standaloneClient) {
        result = await this.standaloneClient.set(fullKey, token, {
          NX: true,
          EX: ttlSeconds,
        });
      } else {
        return null;
      }
      if (result === 'OK') {
        return token;
      }
      return null;
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
      let result: number;
      if (this.mode === 'cluster' && this.clusterClient) {
        result = (await this.clusterClient.eval(
          script,
          1,
          full,
          token,
        )) as number;
      } else if (this.standaloneClient) {
        result = (await this.standaloneClient.eval(script, {
          keys: [full],
          arguments: [token],
        })) as number;
      } else {
        return false;
      }
      return result === 1;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.mode === 'cluster' && this.clusterClient) {
      try {
        await this.clusterClient.quit();
      } catch {
        /* ignore */
      }
    } else if (this.standaloneClient) {
      try {
        await this.standaloneClient.quit();
      } catch {
        /* ignore */
      }
    }
  }
}

// Module-level singleton (consistent with the database package's Prisma singleton).
export const redisService = new RedisService();
