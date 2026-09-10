import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RedisService } from './redis.service';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let redisMock: {
    incr: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    isReady: jest.Mock;
    ttl: jest.Mock;
    acquireLock: jest.Mock;
    releaseLock: jest.Mock;
    ping: jest.Mock;
  };

  beforeEach(async () => {
    redisMock = {
      incr: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(true),
      ttl: jest.fn().mockResolvedValue(60),
      acquireLock: jest.fn().mockResolvedValue('token'),
      releaseLock: jest.fn().mockResolvedValue(true),
      ping: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
  });

  describe('recordFailedLogin', () => {
    it('should increment counter and return count', async () => {
      redisMock.incr.mockResolvedValue(3);
      const count = await service.recordFailedLogin('user@test.com');
      expect(count).toBe(3);
      expect(redisMock.incr).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit:login_fail:'),
        900,
      );
    });

    it('should set lockout key when threshold is reached', async () => {
      redisMock.incr.mockResolvedValue(5);
      await service.recordFailedLogin('user@test.com');
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit:login_lock:'),
        '1',
        900,
      );
    });

    it('should NOT set lockout when below threshold', async () => {
      redisMock.incr.mockResolvedValue(3);
      await service.recordFailedLogin('user@test.com');
      expect(redisMock.set).not.toHaveBeenCalledWith(
        expect.stringContaining('ratelimit:login_lock:'),
        '1',
        900,
      );
    });

    it('should hash email to avoid PII in Redis keys', async () => {
      redisMock.incr.mockResolvedValue(1);
      await service.recordFailedLogin('user@test.com');
      const key = redisMock.incr.mock.calls[0][0];
      expect(key).not.toContain('user@test.com');
      expect(key).toMatch(/[a-f0-9]{64}/); // sha256 hex
    });
  });

  describe('isLoginLocked', () => {
    it('should return true when lock key exists', async () => {
      redisMock.get.mockResolvedValue('1');
      const locked = await service.isLoginLocked('user@test.com');
      expect(locked).toBe(true);
    });

    it('should return false when lock key does not exist', async () => {
      redisMock.get.mockResolvedValue(null);
      const locked = await service.isLoginLocked('user@test.com');
      expect(locked).toBe(false);
    });
  });

  describe('resetLoginAttempts', () => {
    it('should delete both fail and lock keys', async () => {
      await service.resetLoginAttempts('user@test.com');
      expect(redisMock.del).toHaveBeenCalledTimes(2);
      expect(redisMock.del).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit:login_fail:'),
      );
      expect(redisMock.del).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit:login_lock:'),
      );
    });
  });

  describe('checkLimit (non-critical, fails open)', () => {
    it('should return true when under limit', async () => {
      redisMock.incr.mockResolvedValue(5);
      const allowed = await service.checkLimit('api_read', 'user:123', 100, 60);
      expect(allowed).toBe(true);
    });

    it('should return false when over limit', async () => {
      redisMock.incr.mockResolvedValue(101);
      const allowed = await service.checkLimit('api_read', 'user:123', 100, 60);
      expect(allowed).toBe(false);
    });

    it('should fail OPEN when Redis returns null', async () => {
      redisMock.incr.mockResolvedValue(null);
      const allowed = await service.checkLimit('api_read', 'user:123', 100, 60);
      expect(allowed).toBe(true);
    });
  });

  describe('checkLimitCritical (critical, fails closed)', () => {
    it('should return true when under limit', async () => {
      redisMock.incr.mockResolvedValue(5);
      const allowed = await service.checkLimitCritical(
        'auth',
        'user:123',
        30,
        60,
      );
      expect(allowed).toBe(true);
    });

    it('should return false when over limit', async () => {
      redisMock.incr.mockResolvedValue(31);
      const allowed = await service.checkLimitCritical(
        'auth',
        'user:123',
        30,
        60,
      );
      expect(allowed).toBe(false);
    });

    it('should fail CLOSED when Redis returns null', async () => {
      redisMock.incr.mockResolvedValue(null);
      const allowed = await service.checkLimitCritical(
        'auth',
        'user:123',
        30,
        60,
      );
      expect(allowed).toBe(false);
    });
  });

  describe('checkExchangeCodeLimit', () => {
    it('should call checkLimit with correct parameters', async () => {
      redisMock.incr.mockResolvedValue(1);
      const spy = jest.spyOn(service, 'checkLimit').mockResolvedValue(true);
      const result = await service.checkExchangeCodeLimit('1.2.3.4');
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith('exchange_code', '1.2.3.4', 10, 60);
    });
  });

  describe('checkRefreshTokenLimit', () => {
    it('should call checkLimitCritical with correct parameters', async () => {
      redisMock.incr.mockResolvedValue(1);
      const spy = jest
        .spyOn(service, 'checkLimitCritical')
        .mockResolvedValue(true);
      const result = await service.checkRefreshTokenLimit('token-123');
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith('refresh_token', 'token-123', 30, 60);
    });
  });
});
