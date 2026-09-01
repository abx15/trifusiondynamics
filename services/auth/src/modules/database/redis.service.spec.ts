import { RedisService, redisKey, REDIS_KEY_PREFIX } from './redis.service';
import { RedisCacheService } from './redis-cache.service';

// Mock the redis-service singleton for throttler fallback tests.
// jest.mock is hoisted before imports, so RedisThrottlerStorage will use
// the mocked redisService.
jest.mock('./redis.service', () => {
  const actual = jest.requireActual('./redis.service');
  return {
    __esModule: true,
    ...actual,
    redisService: {
      isReady: jest.fn(() => false),
      incr: jest.fn().mockResolvedValue(null),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(undefined),
      ttl: jest.fn().mockResolvedValue(0),
      ping: jest.fn().mockResolvedValue(false),
      acquireLock: jest.fn().mockResolvedValue(null),
      releaseLock: jest.fn().mockResolvedValue(false),
    },
    REDIS_KEY_PREFIX: 'agencyos:test:',
  };
});

// Import mocked module — redisService will be the mock above
import { redisService } from './redis.service';
import { RedisThrottlerStorage } from './redis-throttler.storage';

describe('RedisService', () => {
  let service: RedisService;

  describe('when REDIS_URL is not set', () => {
    beforeEach(() => {
      delete process.env.REDIS_URL;
      delete process.env.NODE_ENV;
      service = new RedisService();
    });

    it('is not ready', () => {
      expect(service.isReady()).toBe(false);
    });

    it('ping returns false', async () => {
      expect(await service.ping()).toBe(false);
    });

    it('set returns false (graceful degradation)', async () => {
      expect(await service.set('test:key', 'value', 60)).toBe(false);
    });

    it('get returns null (graceful degradation)', async () => {
      expect(await service.get('test:key')).toBeNull();
    });

    it('del does not throw', async () => {
      await expect(service.del('test:key')).resolves.toBeUndefined();
    });

    it('incr returns null (graceful degradation)', async () => {
      expect(await service.incr('test:key', 60)).toBeNull();
    });

    it('acquireLock returns null (no Redis, no lock)', async () => {
      expect(await service.acquireLock('test:lock', 60)).toBeNull();
    });

    it('releaseLock returns false (no Redis, no release)', async () => {
      expect(await service.releaseLock('test:lock', 'token')).toBe(false);
    });
  });

  describe('when NODE_ENV is test', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.NODE_ENV = 'test';
      service = new RedisService();
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('is not ready (connection skipped)', () => {
      expect(service.isReady()).toBe(false);
    });
  });

  describe('key helper', () => {
    it('produces namespaced keys', () => {
      expect(redisKey('cache', 'user:123')).toMatch(
        /^agencyos:\w+:cache:user:123$/,
      );
    });

    it('produces consistent prefixes', () => {
      expect(REDIS_KEY_PREFIX).toMatch(/^agencyos:\w+:/);
    });
  });
});

describe('RedisCacheService', () => {
  it('returns undefined when Redis is unavailable', async () => {
    const redisServiceStub = {
      isReady: () => false,
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const cache = new RedisCacheService(redisServiceStub as any);
    expect(await cache.get('some-key')).toBeUndefined();
  });

  it('set returns the value and delegates to Redis', async () => {
    const redisServiceStub = {
      isReady: () => true,
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const cache = new RedisCacheService(redisServiceStub as any);
    const result = await cache.set('test-key', { foo: 'bar' }, 120000);
    expect(result).toEqual({ foo: 'bar' });
    expect(redisServiceStub.set).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify({ foo: 'bar' }),
      120,
    );
  });

  it('get returns parsed JSON value', async () => {
    const redisServiceStub = {
      isReady: () => true,
      get: jest.fn().mockResolvedValue(JSON.stringify({ hello: 'world' })),
      set: jest.fn(),
      del: jest.fn(),
    };
    const cache = new RedisCacheService(redisServiceStub as any);
    const result = await cache.get('test-key');
    expect(result).toEqual({ hello: 'world' });
  });

  it('del delegates to Redis', async () => {
    const redisServiceStub = {
      isReady: () => true,
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const cache = new RedisCacheService(redisServiceStub as any);
    const result = await cache.del('test-key');
    expect(result).toBe(true);
    expect(redisServiceStub.del).toHaveBeenCalledWith('test-key');
  });
});

describe('RedisThrottlerStorage fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redisService.isReady as jest.Mock).mockReturnValue(false);
    (redisService.incr as jest.Mock).mockResolvedValue(null);
  });

  it('uses in-memory fallback when Redis returns null from incr', async () => {
    const storage = new RedisThrottlerStorage();
    const record = await storage.increment(
      '1.2.3.4',
      60000,
      100,
      60000,
      'default',
    );

    expect(record.totalHits).toBeGreaterThanOrEqual(1);
    expect(record.isBlocked).toBe(false);
    expect(record.timeToExpire).toBe(60);
  });

  it('accumulates fallback counts across multiple increments', async () => {
    const storage = new RedisThrottlerStorage();
    await storage.increment('10.0.0.1', 60000, 5, 60000, 'default');
    await storage.increment('10.0.0.1', 60000, 5, 60000, 'default');
    const record = await storage.increment(
      '10.0.0.1',
      60000,
      5,
      60000,
      'default',
    );

    expect(record.totalHits).toBe(3);
    expect(record.isBlocked).toBe(false);
  });

  it('blocks when fallback count exceeds limit', async () => {
    const storage = new RedisThrottlerStorage();
    let blocked = false;
    for (let i = 0; i < 6; i++) {
      const record = await storage.increment(
        '10.0.0.2',
        60000,
        5,
        60000,
        'default',
      );
      if (record.isBlocked) blocked = true;
    }
    expect(blocked).toBe(true);
  });
});
