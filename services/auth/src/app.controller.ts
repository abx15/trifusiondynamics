import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './modules/database/prisma.service';
import { RedisService } from './modules/database/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      checks: {
        postgres: 'configured',
        redis: process.env.REDIS_URL ? 'configured' : 'not_configured',
        ai_service: 'ok',
      },
    };
  }

  // Liveness: the process is alive and able to serve. No downstream checks.
  @Get('health/live')
  getLiveness() {
    return { status: 'ok' };
  }

  // Readiness: the app can reach its critical dependencies.
  // LIVE  = process alive (see /health/live)
  // READY = critical dependency (Postgres) reachable
  // DEGRADED = serving, but a non-critical dependency (Redis) is unavailable
  @Get('health/ready')
  async getReadiness() {
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'ok';
    } catch (err) {
      checks.postgres = 'unavailable';
    }

    // Redis is non-critical: cache/rate-limit degrade gracefully without it.
    // Use an actual PING rather than isReady() to confirm the server is reachable.
    const redisOk = await this.redis.ping();
    checks.redis = redisOk ? 'ok' : 'degraded';

    let status: 'ok' | 'degraded' | 'unavailable';
    if (checks.postgres === 'ok') {
      status = checks.redis === 'ok' ? 'ok' : 'degraded';
    } else {
      status = 'unavailable';
    }

    return { status, checks };
  }
}
