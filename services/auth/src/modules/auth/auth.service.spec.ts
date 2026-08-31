import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcryptjs';

jest.mock('@agency-os/database', () => ({
  authActivityLogRepository: {
    getFailedLoginsSince: jest.fn().mockResolvedValue(0),
    logEvent: jest.fn().mockResolvedValue(true),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
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
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
