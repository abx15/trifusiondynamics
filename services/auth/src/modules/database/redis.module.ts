import { Global, Module } from '@nestjs/common';
import { RedisService, redisService } from './redis.service';

@Global()
@Module({
  providers: [{ provide: RedisService, useValue: redisService }],
  exports: [RedisService],
})
export class RedisModule {}
