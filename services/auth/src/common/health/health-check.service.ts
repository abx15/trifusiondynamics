import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { redisService } from '../../modules/database/redis.service';
import { QUEUE_NAMES } from '../../modules/queue/queue.constants';
import {
  getQueueRedisConnection,
  isRedisConfigured,
} from '../../modules/queue/queue.redis.config';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  region: string;
  checks: HealthCheck[];
  version: string;
  uptime: number;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface RegionConfig {
  name: string;
  isPrimary: boolean;
  endpoints: {
    api: string;
    health: string;
  };
  database: {
    host: string;
    port: number;
    replicaHost?: string;
  };
  redis: {
    host: string;
    port: number;
    replicaHost?: string;
  };
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();
  private readonly region: string;
  private readonly isPrimary: boolean;
  private readonly prisma: PrismaClient;

  constructor() {
    this.region = process.env.AWS_REGION || process.env.REGION || 'us-east-1';
    this.isPrimary = process.env.IS_PRIMARY_REGION === 'true';
    this.prisma = new PrismaClient();
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemory(),
      this.checkExternalServices(),
    ]);

    const unhealthyCount = checks.filter(
      (c) => c.status === 'unhealthy',
    ).length;
    const degradedCount = checks.filter((c) => c.status === 'degraded').length;

    let overallStatus: HealthCheckResult['status'] = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      region: this.region,
      checks,
      version: process.env.APP_VERSION || 'unknown',
      uptime: Date.now() - this.startTime,
    };
  }

  async performDeepHealthCheck(): Promise<HealthCheckResult> {
    const basic = await this.performHealthCheck();
    const deepChecks = await Promise.all([
      this.checkDatabaseReplication(),
      this.checkRedisReplication(),
      this.checkQueueHealth(),
      this.checkStorage(),
    ]);

    return {
      ...basic,
      checks: [...basic.checks, ...deepChecks],
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        name: 'database',
        status: latency > 1000 ? 'degraded' : 'healthy',
        latencyMs: latency,
        message: latency > 1000 ? 'High latency' : 'OK',
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkDatabaseReplication(): Promise<HealthCheck> {
    try {
      if (!this.isPrimary) {
        const result = await this.prisma.$queryRaw<
          Array<{ lag_seconds: number; is_replica: boolean }>
        >`
          SELECT 
            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds,
            pg_is_in_recovery() AS is_replica
        `;

        const lag = result[0]?.lag_seconds || 0;
        const isReplica = result[0]?.is_replica;

        return {
          name: 'database_replication',
          status: lag > 60 ? 'degraded' : lag > 300 ? 'unhealthy' : 'healthy',
          latencyMs: 0,
          message: isReplica
            ? `Replication lag: ${lag.toFixed(1)}s`
            : 'Primary database',
          details: { lagSeconds: lag, isReplica },
        };
      }

      const result = await this.prisma.$queryRaw<
        Array<{
          client_addr: string;
          state: string;
          sync_state: string;
          write_lag: string;
          flush_lag: string;
          replay_lag: string;
        }>
      >`
        SELECT 
          client_addr,
          state,
          sync_state,
          write_lag,
          flush_lag,
          replay_lag
        FROM pg_stat_replication
      `;

      const maxLag = result.reduce((max, r) => {
        const lag = r.replay_lag ? parseInt(r.replay_lag, 10) : 0;
        return Math.max(max, lag);
      }, 0);

      return {
        name: 'database_replication',
        status:
          maxLag > 60 ? 'degraded' : maxLag > 300 ? 'unhealthy' : 'healthy',
        message:
          result.length > 0
            ? `Max replication lag: ${maxLag}ms`
            : 'No replicas connected',
        details: { replicas: result.length, maxLagMs: maxLag },
      };
    } catch (error) {
      return {
        name: 'database_replication',
        status: 'unhealthy',
        message:
          error instanceof Error ? error.message : 'Replication check failed',
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const isReady = redisService.isReady();
      if (!isReady) {
        return {
          name: 'redis',
          status: 'unhealthy',
          latencyMs: Date.now() - start,
          message: 'Redis not ready',
        };
      }

      const pingResult = await redisService.ping();
      const latency = Date.now() - start;

      return {
        name: 'redis',
        status: pingResult
          ? latency > 500
            ? 'degraded'
            : 'healthy'
          : 'unhealthy',
        latencyMs: latency,
        message: pingResult ? 'OK' : 'Ping failed',
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkRedisReplication(): Promise<HealthCheck> {
    try {
      const info = await (redisService as any).client?.info?.('replication');
      if (!info) {
        return {
          name: 'redis_replication',
          status: 'healthy',
          message: 'Standalone Redis (no replication)',
        };
      }

      const lines = info.split('\r\n');
      const role = lines
        .find((l) => l.startsWith('role:'))
        ?.split(':')[1]
        ?.trim();
      const masterLinkStatus = lines
        .find((l) => l.startsWith('master_link_status:'))
        ?.split(':')[1]
        ?.trim();
      const slaveLag = lines
        .find((l) => l.startsWith('slave_lag:'))
        ?.split(':')[1]
        ?.trim();

      if (role === 'slave') {
        const lag = parseInt(slaveLag || '0', 10);
        return {
          name: 'redis_replication',
          status:
            lag > 1000 ? 'degraded' : lag > 5000 ? 'unhealthy' : 'healthy',
          message: `Replica lag: ${lag}ms, link: ${masterLinkStatus}`,
          details: { role, masterLinkStatus, lagMs: lag },
        };
      }

      return {
        name: 'redis_replication',
        status: 'healthy',
        message: 'Primary Redis',
        details: {
          role,
          connectedSlaves: lines.filter((l) => l.startsWith('slave')).length,
        },
      };
    } catch (error) {
      return {
        name: 'redis_replication',
        status: 'degraded',
        message:
          error instanceof Error ? error.message : 'Replication check failed',
      };
    }
  }

  private async checkDiskSpace(): Promise<HealthCheck> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('df -h /', { encoding: 'utf-8' });
      const lines = output.trim().split('\n');
      const parts = lines[1].split(/\s+/);
      const usagePercent = parseInt(parts[4].replace('%', ''), 10);

      return {
        name: 'disk_space',
        status:
          usagePercent > 90
            ? 'unhealthy'
            : usagePercent > 80
              ? 'degraded'
              : 'healthy',
        message: `Disk usage: ${usagePercent}%`,
        details: { usagePercent, available: parts[3] },
      };
    } catch {
      return {
        name: 'disk_space',
        status: 'degraded',
        message: 'Could not check disk space',
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('free -m', { encoding: 'utf-8' });
      const lines = output.trim().split('\n');
      const memParts = lines[1].split(/\s+/);
      const total = parseInt(memParts[1], 10);
      const used = parseInt(memParts[2], 10);
      const usagePercent = Math.round((used / total) * 100);

      return {
        name: 'memory',
        status:
          usagePercent > 95
            ? 'unhealthy'
            : usagePercent > 85
              ? 'degraded'
              : 'healthy',
        message: `Memory usage: ${usagePercent}% (${used}MB / ${total}MB)`,
        details: { usagePercent, usedMB: used, totalMB: total },
      };
    } catch {
      return {
        name: 'memory',
        status: 'degraded',
        message: 'Could not check memory',
      };
    }
  }

  private async checkExternalServices(): Promise<HealthCheck> {
    const services = [
      { name: 'Vault', url: process.env.VAULT_ADDR },
      { name: 'AI Service', url: process.env.AI_SERVICE_URL },
    ].filter((s) => s.url);

    const results = await Promise.all(
      services.map(async ({ name, url }) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(`${url}/health`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          return { name, healthy: response.ok };
        } catch {
          return { name, healthy: false };
        }
      }),
    );

    const failed = results.filter((r) => !r.healthy);

    return {
      name: 'external_services',
      status: failed.length > 0 ? 'degraded' : 'healthy',
      message:
        failed.length > 0
          ? `Failed: ${failed.map((f) => f.name).join(', ')}`
          : 'All OK',
      details: { services: results },
    };
  }

  private async checkQueueHealth(): Promise<HealthCheck> {
    if (!isRedisConfigured()) {
      return {
        name: 'queue_health',
        status: 'degraded',
        message: 'Redis not configured — queue disabled',
      };
    }

    let queue: import('bullmq').Queue | undefined;
    try {
      const { Queue } = await import('bullmq');
      queue = new Queue(QUEUE_NAMES.EMAILS, {
        connection: getQueueRedisConnection(),
      });
      queue.on('error', (error) => {
        this.logger.warn(`Queue health connection failed: ${error.message}`);
      });

      const counts = await queue.getJobCounts();

      const failed = counts.failed || 0;
      const waiting = counts.waiting || 0;

      return {
        name: 'queue_health',
        status:
          failed > 100 ? 'unhealthy' : failed > 10 ? 'degraded' : 'healthy',
        message: `Waiting: ${waiting}, Failed: ${failed}`,
        details: counts,
      };
    } catch {
      return {
        name: 'queue_health',
        status: 'degraded',
        message: 'Could not check queue',
      };
    } finally {
      if (queue) {
        await queue.close().catch((error: unknown) => {
          this.logger.warn(
            `Could not close queue health connection: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
      }
    }
  }

  private async checkStorage(): Promise<HealthCheck> {
    try {
      const { S3Client, ListBucketsCommand } =
        await import('@aws-sdk/client-s3');
      const client = new S3Client({ region: this.region });
      await client.send(new ListBucketsCommand({}));

      return {
        name: 'storage',
        status: 'healthy',
        message: 'S3 accessible',
      };
    } catch (error) {
      return {
        name: 'storage',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'S3 check failed',
      };
    }
  }

  isPrimaryRegion(): boolean {
    return this.isPrimary;
  }

  getRegion(): string {
    return this.region;
  }
}
