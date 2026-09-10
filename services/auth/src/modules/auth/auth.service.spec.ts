import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { UnauthorizedException } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '../database/redis.service';
import { RateLimitService } from '../database/rate-limit.service';

jest.mock('@agency-os/database', () => ({
  authActivityLogRepository: {
    getFailedLoginsSince: jest.fn().mockResolvedValue(0),
    logEvent: jest.fn().mockResolvedValue(true),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let rateLimitMock: DeepMockProxy<RateLimitService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    rateLimitMock = mockDeep<RateLimitService>();
    rateLimitMock.isLoginLocked.mockResolvedValue(false);
    rateLimitMock.recordFailedLogin.mockResolvedValue(1);
    rateLimitMock.resetLoginAttempts.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RateLimitService, useValue: rateLimitMock },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(false),
            del: jest.fn().mockResolvedValue(undefined),
            isReady: () => false,
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens if credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        password: hashedPassword,
        organizationId: 'org-1',
        isActive: true,
        mustChangePassword: false,
        organization: { isActive: true },
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        password: hashedPassword,
        organizationId: 'org-1',
        isActive: true,
        mustChangePassword: false,
        organization: { isActive: true },
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if organization is archived', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        password: hashedPassword,
        organizationId: 'org-1',
        isActive: true,
        mustChangePassword: false,
        organization: { isActive: false },
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        service.login({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('brute-force protection', () => {
    it('should reject login with 429 when account is locked', async () => {
      rateLimitMock.isLoginLocked.mockResolvedValue(true);

      await expect(
        service.login({ email: 'locked@test.com', password: 'anything' }),
      ).rejects.toThrow(HttpException);
    });

    it('should record failed login attempt on wrong password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        password: hashedPassword,
        organizationId: 'org-1',
        isActive: true,
        mustChangePassword: false,
        organization: { isActive: true },
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(rateLimitMock.recordFailedLogin).toHaveBeenCalledWith('test@test.com');
    });

    it('should reset login attempts on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        password: hashedPassword,
        organizationId: 'org-1',
        isActive: true,
        mustChangePassword: false,
        organization: { isActive: true },
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await service.login({ email: 'test@test.com', password: 'password123' });

      expect(rateLimitMock.resetLoginAttempts).toHaveBeenCalledWith('test@test.com');
    });

    it('should not call recordFailedLogin when user not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(rateLimitMock.recordFailedLogin).not.toHaveBeenCalled();
    });
  });
});
