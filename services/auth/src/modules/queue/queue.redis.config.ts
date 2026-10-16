import type { RedisOptions } from 'bullmq';

export function getQueueRedisConnection(
  maxRetriesPerRequest: number | null = 3,
): RedisOptions {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const url = new URL(redisUrl);
    if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
      throw new Error('REDIS_URL must use the redis:// or rediss:// protocol');
    }

    const databasePath = url.pathname.slice(1);
    const database = databasePath ? Number(databasePath) : undefined;
    if (database !== undefined && !Number.isInteger(database)) {
      throw new Error('REDIS_URL database path must be an integer');
    }

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      db: database,
      tls: url.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      enableReadyCheck: true,
      lazyConnect: true,
    };
  }

  const port = Number(process.env.REDIS_PORT || 6379);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('REDIS_PORT must be a valid TCP port');
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port,
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    enableReadyCheck: true,
    lazyConnect: true,
  };
}

/**
 * Returns true only when an external Redis is explicitly configured via
 * REDIS_URL. When false, BullMQ queues/workers are disabled and the
 * application starts without attempting any Redis connection, so a missing
 * or unreachable Redis can never crash the deploy.
 */
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
