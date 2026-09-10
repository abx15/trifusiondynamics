import { Test, TestingModule } from '@nestjs/testing';
import { UserThrottlerGuard } from './user-throttler.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

describe('UserThrottlerGuard', () => {
  let guard: UserThrottlerGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserThrottlerGuard,
        {
          provide: 'THROTTLER:MODULE_OPTIONS',
          useValue: {
            throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
          } as ThrottlerModuleOptions,
        },
        {
          provide: 'THROTTLER:STORAGE_SERVICE',
          useValue: {
            increment: jest.fn().mockResolvedValue({
              totalHits: 1,
              timeToExpire: 60,
              isBlocked: false,
              timeToBlockExpire: 0,
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<UserThrottlerGuard>(UserThrottlerGuard);
  });

  function createMockContext(overrides: Partial<{
    headers: Record<string, string>;
    cookies: Record<string, string>;
    ip: string;
    user: any;
  }> = {}): ExecutionContext {
    const req: any = {
      headers: overrides.headers || {},
      cookies: overrides.cookies || {},
      ip: overrides.ip || '1.2.3.4',
      socket: { remoteAddress: overrides.ip || '1.2.3.4' },
    };

    const handler = { prototype: jest.fn() };
    const classRef = function () {};

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({
          header: jest.fn(),
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }),
      }),
      getHandler: () => handler,
      getClass: () => classRef,
    } as unknown as ExecutionContext;
  }

  describe('getTracker', () => {
    const getTracker = (guard: UserThrottlerGuard, req: any) =>
      (guard as any).getTracker(req);

    it('should return user-scoped tracker when valid Bearer token provided', async () => {
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        sub: 'user-123',
        email: 'test@test.com',
        orgId: 'org-1',
        roles: [],
        permissions: [],
      });

      const context = createMockContext({
        headers: { authorization: 'Bearer valid.jwt.token' },
      });

      const req = context.switchToHttp().getRequest();
      const tracker = await getTracker(guard, req);
      expect(tracker).toBe('user:user-123');
    });

    it('should return IP tracker when no auth header present', async () => {
      const context = createMockContext({
        headers: {},
      });

      const req = context.switchToHttp().getRequest();
      const tracker = await getTracker(guard, req);
      expect(tracker).toBe('1.2.3.4');
    });

    it('should return IP tracker when JWT is invalid', async () => {
      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const context = createMockContext({
        headers: { authorization: 'Bearer invalid.token.here' },
      });

      const req = context.switchToHttp().getRequest();
      const tracker = await getTracker(guard, req);
      expect(tracker).toBe('1.2.3.4');
    });

    it('should return user-scoped tracker when access_token cookie present', async () => {
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        sub: 'cookie-user-456',
        email: 'cookie@test.com',
        orgId: 'org-1',
        roles: [],
        permissions: [],
      });

      const context = createMockContext({
        cookies: { access_token: 'valid.jwt.token' },
      });

      const req = context.switchToHttp().getRequest();
      const tracker = await getTracker(guard, req);
      expect(tracker).toBe('user:cookie-user-456');
    });

    it('should fall back to IP when JWT_ACCESS_SECRET is not set', async () => {
      const original = process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_ACCESS_SECRET;

      const context = createMockContext({
        headers: { authorization: 'Bearer some.token.here' },
      });

      const req = context.switchToHttp().getRequest();
      const tracker = await getTracker(guard, req);
      expect(tracker).toBe('1.2.3.4');

      if (original) {
        process.env.JWT_ACCESS_SECRET = original;
      }
    });
  });
});
