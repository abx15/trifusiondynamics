import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from './health-check.service';

describe('HealthCheckService', () => {
  let service: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthCheckService],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have performHealthCheck method', () => {
    expect(typeof service.performHealthCheck).toBe('function');
  });

  it('should have performDeepHealthCheck method', () => {
    expect(typeof service.performDeepHealthCheck).toBe('function');
  });

  it('should have isPrimaryRegion method', () => {
    expect(typeof service.isPrimaryRegion).toBe('function');
  });

  it('should have getRegion method', () => {
    expect(typeof service.getRegion).toBe('function');
  });

  it('should return region info', () => {
    const region = service.getRegion();
    expect(typeof region).toBe('string');
    expect(region.length).toBeGreaterThan(0);
  });

  it('should return primary region status', () => {
    const isPrimary = service.isPrimaryRegion();
    expect(typeof isPrimary).toBe('boolean');
  });
});

describe('HealthCheckService - Health Check Result Structure', () => {
  let service: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthCheckService],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should return valid health check structure', async () => {
    const result = await service.performHealthCheck();

    expect(result).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('region');
    expect(result).toHaveProperty('checks');
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('uptime');
    expect(typeof result.uptime).toBe('number');
  });

  it('should have checks with proper structure', async () => {
    const result = await service.performHealthCheck();

    for (const check of result.checks) {
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(check.status);
    }
  });

  it('should include database check', async () => {
    const result = await service.performHealthCheck();
    const dbCheck = result.checks.find(c => c.name === 'database');
    expect(dbCheck).toBeDefined();
  });

  it('should include redis check', async () => {
    const result = await service.performHealthCheck();
    const redisCheck = result.checks.find(c => c.name === 'redis');
    expect(redisCheck).toBeDefined();
  });
});