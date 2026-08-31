import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './modules/database/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
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
  @Get('health/ready')
  async getReadiness() {
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'ok';
    } catch (err) {
      checks.postgres = 'unavailable';
    }

    const ready = checks.postgres === 'ok';
    return {
      status: ready ? 'ok' : 'degraded',
      checks,
    };
  }
}
