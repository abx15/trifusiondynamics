import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

describe('RedisService - Cluster Support', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should default to standalone mode', () => {
    expect(service.getMode()).toBe('standalone');
  });

  it('should have isReady method', () => {
    expect(typeof service.isReady).toBe('function');
  });

  it('should have ping method', () => {
    expect(typeof service.ping).toBe('function');
  });

  it('should have set/get/del methods', () => {
    expect(typeof service.set).toBe('function');
    expect(typeof service.get).toBe('function');
    expect(typeof service.del).toBe('function');
  });

  it('should have incr/ttl methods', () => {
    expect(typeof service.incr).toBe('function');
    expect(typeof service.ttl).toBe('function');
  });

  it('should have acquireLock/releaseLock methods', () => {
    expect(typeof service.acquireLock).toBe('function');
    expect(typeof service.releaseLock).toBe('function');
  });
});