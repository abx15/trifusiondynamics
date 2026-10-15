import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheckResult } from './health-check.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheck: HealthCheckService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthCheckResult> {
    return this.healthCheck.performHealthCheck();
  }

  @Get('deep')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deep health check with replication status' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async deepCheck(): Promise<HealthCheckResult> {
    return this.healthCheck.performDeepHealthCheck();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Ready to serve traffic' })
  @ApiResponse({ status: 503, description: 'Not ready' })
  async ready(): Promise<{ ready: boolean }> {
    const result = await this.healthCheck.performHealthCheck();
    return { ready: result.status !== 'unhealthy' };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  async live(): Promise<{ alive: boolean; uptime: number }> {
    return {
      alive: true,
      uptime: Date.now() - (global as any).startTime || Date.now(),
    };
  }

  @Get('region')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current region info' })
  @ApiResponse({ status: 200, description: 'Region information' })
  async region(): Promise<{
    region: string;
    isPrimary: boolean;
    timestamp: string;
  }> {
    return {
      region: this.healthCheck.getRegion(),
      isPrimary: this.healthCheck.isPrimaryRegion(),
      timestamp: new Date().toISOString(),
    };
  }
}