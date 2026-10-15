import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisService } from '../../modules/database/redis.service';

export interface FailoverConfig {
  enabled: boolean;
  primaryRegion: string;
  secondaryRegions: string[];
  healthCheckInterval: number;
  failureThreshold: number;
  recoveryThreshold: number;
  dnsProvider: 'cloudflare' | 'route53' | 'azure';
  dnsZoneId: string;
  dnsRecordName: string;
  notifyWebhook?: string;
}

export interface FailoverState {
  currentPrimary: string;
  status: 'normal' | 'failover_in_progress' | 'failed_over' | 'recovering';
  lastFailover?: string;
  failureCount: Record<string, number>;
  healthyRegions: string[];
}

@Injectable()
export class FailoverController implements OnModuleInit {
  private readonly logger = new Logger(FailoverController.name);
  private config: FailoverConfig;
  private state: FailoverState;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enabled: configService.get('FAILOVER_ENABLED') === 'true',
      primaryRegion: configService.get('PRIMARY_REGION') || 'us-east-1',
      secondaryRegions: (configService.get('SECONDARY_REGIONS') || 'eu-west-1,us-west-2').split(','),
      healthCheckInterval: parseInt(configService.get('FAILOVER_HEALTH_CHECK_INTERVAL') || '30000', 10),
      failureThreshold: parseInt(configService.get('FAILOVER_FAILURE_THRESHOLD') || '3', 10),
      recoveryThreshold: parseInt(configService.get('FAILOVER_RECOVERY_THRESHOLD') || '2', 10),
      dnsProvider: (configService.get('FAILOVER_DNS_PROVIDER') as any) || 'cloudflare',
      dnsZoneId: configService.get('FAILOVER_DNS_ZONE_ID') || '',
      dnsRecordName: configService.get('FAILOVER_DNS_RECORD_NAME') || 'api',
      notifyWebhook: configService.get('FAILOVER_NOTIFY_WEBHOOK'),
    };

    this.state = {
      currentPrimary: this.config.primaryRegion,
      status: 'normal',
      failureCount: {},
      healthyRegions: [this.config.primaryRegion, ...this.config.secondaryRegions],
    };
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Failover controller disabled');
      return;
    }

    await this.loadState();
    this.startHealthChecks();
    this.logger.log(`Failover controller started. Primary: ${this.config.primaryRegion}`);
  }

  private async loadState(): Promise<void> {
    try {
      const saved = await redisService.get('failover:state');
      if (saved) {
        this.state = { ...this.state, ...JSON.parse(saved) };
      }
    } catch {
      this.logger.warn('Could not load failover state');
    }
  }

  private async saveState(): Promise<void> {
    try {
      await redisService.set('failover:state', JSON.stringify(this.state), 86400);
    } catch {
      this.logger.warn('Could not save failover state');
    }
  }

  private startHealthChecks(): void {
    this.isRunning = true;
    this.healthCheckTimer = setInterval(() => this.runHealthChecks(), this.config.healthCheckInterval);
    this.runHealthChecks();
  }

  async runHealthChecks(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const regions = [this.config.primaryRegion, ...this.config.secondaryRegions];
      const results = await Promise.all(
        regions.map(region => this.checkRegionHealth(region))
      );

      const healthyRegions: string[] = [];
      const unhealthyRegions: string[] = [];

      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const result = results[i];

        if (result.healthy) {
          healthyRegions.push(region);
          this.state.failureCount[region] = 0;
        } else {
          unhealthyRegions.push(region);
          this.state.failureCount[region] = (this.state.failureCount[region] || 0) + 1;
        }
      }

      this.state.healthyRegions = healthyRegions;

      if (unhealthyRegions.includes(this.state.currentPrimary)) {
        const failures = this.state.failureCount[this.state.currentPrimary] || 0;
        if (failures >= this.config.failureThreshold) {
          await this.initiateFailover(unhealthyRegions, healthyRegions);
        }
      } else if (this.state.status === 'failed_over') {
        const primaryFailures = this.state.failureCount[this.config.primaryRegion] || 0;
        if (primaryFailures === 0 && healthyRegions.includes(this.config.primaryRegion)) {
          const recoveryCount = (await redisService.get('failover:recovery_count')) || '0';
          const count = parseInt(recoveryCount, 10) + 1;
          await redisService.set('failover:recovery_count', String(count), 3600);

          if (count >= this.config.recoveryThreshold) {
            await this.initiateRecovery();
          }
        } else {
          await redisService.del('failover:recovery_count');
        }
      }

      await this.saveState();
    } catch (error) {
      this.logger.error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkRegionHealth(region: string): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const endpoint = region === this.config.primaryRegion
        ? process.env.PRIMARY_API_ENDPOINT
        : process.env[`SECONDARY_${region.toUpperCase().replace(/-/g, '_')}_API_ENDPOINT`];

      if (!endpoint) {
        return { healthy: false, error: 'No endpoint configured' };
      }

      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${endpoint}/health/ready`, { signal: controller.signal });
      clearTimeout(timeout);

      const latency = Date.now() - start;
      return { healthy: response.ok, latency };
    } catch (error) {
      return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async initiateFailover(unhealthyRegions: string[], healthyRegions: string[]): Promise<void> {
    if (this.state.status === 'failover_in_progress') {
      return;
    }

    this.logger.error(`INITIATING FAILOVER: Primary ${this.state.currentPrimary} is unhealthy`);
    this.state.status = 'failover_in_progress';
    await this.saveState();

    const newPrimary = healthyRegions.find(r => r !== this.state.currentPrimary);
    if (!newPrimary) {
      this.logger.error('NO HEALTHY REGIONS AVAILABLE FOR FAILOVER!');
      await this.notify('CRITICAL: No healthy regions available for failover', 'critical');
      return;
    }

    try {
      await this.promoteDatabase(newPrimary);
      await this.updateDNS(newPrimary);
      await this.scaleUpRegion(newPrimary);

      this.state.currentPrimary = newPrimary;
      this.state.status = 'failed_over';
      this.state.lastFailover = new Date().toISOString();
      await this.saveState();

      await this.notify(
        `Failover completed. New primary: ${newPrimary}. Previous: ${unhealthyRegions.join(', ')}`,
        'warning'
      );

      this.logger.log(`Failover completed. New primary: ${newPrimary}`);
    } catch (error) {
      this.state.status = 'normal';
      await this.saveState();
      await this.notify(`Failover failed: ${error instanceof Error ? error.message : String(error)}`, 'critical');
      throw error;
    }
  }

  private async initiateRecovery(): Promise<void> {
    if (this.state.currentPrimary === this.config.primaryRegion) {
      return;
    }

    this.logger.log('Initiating recovery to primary region');
    this.state.status = 'recovering';
    await this.saveState();

    try {
      await this.promoteDatabase(this.config.primaryRegion);
      await this.updateDNS(this.config.primaryRegion);
      await this.scaleDownRegion(this.state.currentPrimary);

      this.state.currentPrimary = this.config.primaryRegion;
      this.state.status = 'normal';
      await redisService.del('failover:recovery_count');
      await this.saveState();

      await this.notify('Recovery completed. Primary region restored.', 'info');
      this.logger.log('Recovery completed. Primary region restored.');
    } catch (error) {
      this.state.status = 'failed_over';
      await this.saveState();
      await this.notify(`Recovery failed: ${error instanceof Error ? error.message : String(error)}`, 'critical');
      throw error;
    }
  }

  private async promoteDatabase(region: string): Promise<void> {
    this.logger.log(`Promoting database in ${region} to primary`);

    const { execSync } = await import('child_process');
    const dbHost = region === this.config.primaryRegion
      ? process.env.PRIMARY_DB_HOST
      : process.env[`SECONDARY_${region.toUpperCase().replace(/-/g, '_')}_DB_HOST`];

    if (dbHost) {
      execSync(`pg_ctl promote -D /var/lib/postgresql/data`, { stdio: 'inherit' });
    }
  }

  private async updateDNS(region: string): Promise<void> {
    const endpoint = region === this.config.primaryRegion
      ? process.env.PRIMARY_API_ENDPOINT
      : process.env[`SECONDARY_${region.toUpperCase().replace(/-/g, '_')}_API_ENDPOINT`];

    if (!endpoint) {
      throw new Error(`No endpoint for region ${region}`);
    }

    const hostname = new URL(endpoint).hostname;

    switch (this.config.dnsProvider) {
      case 'cloudflare':
        await this.updateCloudflareDNS(hostname);
        break;
      case 'route53':
        await this.updateRoute53DNS(hostname);
        break;
      case 'azure':
        await this.updateAzureDNS(hostname);
        break;
    }

    this.logger.log(`DNS updated to point to ${hostname}`);
  }

  private async updateCloudflareDNS(target: string): Promise<void> {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = this.config.dnsZoneId;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${this.config.dnsRecordName}&type=CNAME`,
      {
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    const record = data.result[0];

    if (record) {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CNAME',
          name: this.config.dnsRecordName,
          content: target,
          ttl: 60,
          proxied: true,
        }),
      });
    }
  }

  private async updateRoute53DNS(target: string): Promise<void> {
    const { Route53Client, ChangeResourceRecordSetsCommand } = await import('@aws-sdk/client-route-53');
    const client = new Route53Client({ region: this.config.primaryRegion });

    await client.send(new ChangeResourceRecordSetsCommand({
      HostedZoneId: this.config.dnsZoneId,
      ChangeBatch: {
        Changes: [{
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: `${this.config.dnsRecordName}.${process.env.DOMAIN_NAME}`,
            Type: 'CNAME',
            TTL: 60,
            ResourceRecords: [{ Value: target }],
          },
        }],
      },
    }));
  }

  private async updateAzureDNS(target: string): Promise<void> {
    this.logger.warn('Azure DNS update not implemented');
  }

  private async scaleUpRegion(region: string): Promise<void> {
    this.logger.log(`Scaling up region ${region}`);
  }

  private async scaleDownRegion(region: string): Promise<void> {
    this.logger.log(`Scaling down region ${region}`);
  }

  private async notify(message: string, severity: 'info' | 'warning' | 'critical'): Promise<void> {
    this.logger.log(`[${severity.toUpperCase()}] ${message}`);

    if (this.config.notifyWebhook) {
      try {
        await fetch(this.config.notifyWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `[AgencyOS Failover] ${message}`,
            severity,
            timestamp: new Date().toISOString(),
            region: this.config.primaryRegion,
            state: this.state,
          }),
        });
      } catch {
        this.logger.warn('Failed to send notification webhook');
      }
    }
  }

  async getState(): Promise<FailoverState> {
    return { ...this.state };
  }

  async manualFailover(targetRegion: string): Promise<void> {
    if (!this.config.secondaryRegions.includes(targetRegion)) {
      throw new Error(`Invalid target region: ${targetRegion}`);
    }

    this.logger.warn(`MANUAL FAILOVER initiated to ${targetRegion}`);
    await this.initiateFailover([this.state.currentPrimary], [targetRegion]);
  }

  async manualRecovery(): Promise<void> {
    this.logger.warn('MANUAL RECOVERY initiated');
    await redisService.set('failover:recovery_count', String(this.config.recoveryThreshold), 3600);
    await this.initiateRecovery();
  }

  onModuleDestroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.isRunning = false;
  }
}