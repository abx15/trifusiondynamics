import { Global, Module } from '@nestjs/common';
import { RedisService, redisService } from './redis.service';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  providers: [
    { provide: RedisService, useValue: redisService },
    {
      provide: 'REDIS_CACHE_SERVICE',
      useFactory: () => new RedisCacheService(redisService),
    },
  ],
  exports: [RedisService, 'REDIS_CACHE_SERVICE', RedisCacheService],
})
export class RedisModule {}
