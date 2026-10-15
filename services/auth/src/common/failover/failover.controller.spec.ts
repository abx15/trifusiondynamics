import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FailoverController } from './failover.controller';

describe('FailoverController', () => {
  let controller: FailoverController;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          FAILOVER_ENABLED: 'false',
          PRIMARY_REGION: 'us-east-1',
          SECONDARY_REGIONS: 'eu-west-1,us-west-2',
          FAILOVER_HEALTH_CHECK_INTERVAL: '30000',
          FAILOVER_FAILURE_THRESHOLD: '3',
          FAILOVER_RECOVERY_THRESHOLD: '2',
          FAILOVER_DNS_PROVIDER: 'cloudflare',
          FAILOVER_DNS_ZONE_ID: 'test-zone-id',
          FAILOVER_DNS_RECORD_NAME: 'api',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailoverController,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<FailoverController>(FailoverController);
  });

  afterEach(async () => {
    await controller.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have getState method', () => {
    expect(typeof controller.getState).toBe('function');
  });

  it('should have manualFailover method', () => {
    expect(typeof controller.manualFailover).toBe('function');
  });

  it('should have manualRecovery method', () => {
    expect(typeof controller.manualRecovery).toBe('function');
  });

  it('should return initial state', async () => {
    const state = await controller.getState();
    expect(state).toHaveProperty('currentPrimary');
    expect(state).toHaveProperty('status');
    expect(state).toHaveProperty('failureCount');
    expect(state).toHaveProperty('healthyRegions');
    expect(state.status).toBe('normal');
  });

  it('should have correct initial primary region', async () => {
    const state = await controller.getState();
    expect(state.currentPrimary).toBe('us-east-1');
  });
});

describe('FailoverController - Configuration', () => {
  it('should parse secondary regions correctly', async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          FAILOVER_ENABLED: 'true',
          PRIMARY_REGION: 'us-east-1',
          SECONDARY_REGIONS: 'eu-west-1,us-west-2,ap-southeast-1',
          FAILOVER_HEALTH_CHECK_INTERVAL: '30000',
          FAILOVER_FAILURE_THRESHOLD: '3',
          FAILOVER_RECOVERY_THRESHOLD: '2',
          FAILOVER_DNS_PROVIDER: 'cloudflare',
          FAILOVER_DNS_ZONE_ID: 'test-zone-id',
          FAILOVER_DNS_RECORD_NAME: 'api',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailoverController,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const controller = module.get<FailoverController>(FailoverController);
    const state = await controller.getState();

    expect(state.healthyRegions).toContain('us-east-1');
    expect(state.healthyRegions).toContain('eu-west-1');
    expect(state.healthyRegions).toContain('us-west-2');
    expect(state.healthyRegions).toContain('ap-southeast-1');

    await controller.onModuleDestroy();
  });
});