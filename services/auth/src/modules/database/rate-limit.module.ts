import { Module } from '@nestjs/common';
import { RedisModule } from './redis.module';
import { RateLimitService } from './rate-limit.service';

/**
 * Provides RateLimitService (Redis-backed fine-grained rate limiting) alongside
 * the existing Redis infrastructure.
 *
 * This module does NOT create a new Redis connection — RateLimitService reuses
 * the singleton RedisService from RedisModule.
 */
@Module({
  imports: [RedisModule],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
