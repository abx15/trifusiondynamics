import { Global, Module } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisService, redisService } from './redis.service';
import { RedisCacheService } from './redis-cache.service';

/**
 * Global module providing:
 * - RedisService: the singleton Redis client wrapper
 * - CACHE_MANAGER: Redis-backed cache (replaces process-local memory store)
 */
@Global()
@Module({
  providers: [
    { provide: RedisService, useValue: redisService },
    {
      provide: CACHE_MANAGER,
      useFactory: () => new RedisCacheService(redisService),
    },
  ],
  exports: [RedisService, CACHE_MANAGER],
})
export class RedisModule {}
