import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcryptjs';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let dbMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    dbMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeysService, { provide: PrismaService, useValue: dbMock }],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  describe('generateKey', () => {
    it('should generate and return a valid raw key', async () => {
      dbMock.apiKey.create.mockImplementation(async (args: any) => ({
        id: 'key-1',
        ...args.data,
      }));

      const result = await service.generateKey('org-1', 'user-1', {
        name: 'Test Key',
        scopes: ['read'],
      });

      expect(result.rawKey.startsWith('tfx_live_')).toBe(true);
    });
  });

  describe('validateKey', () => {
    it('should validate correctly for valid key', async () => {
      const rawKey = 'tfx_live_randomstring123';
      const hashedKey = await bcrypt.hash(rawKey, 10);
      dbMock.apiKey.findFirst.mockResolvedValue({
        id: 'key-1',
        hashedKey,
      } as any);
      dbMock.apiKey.update.mockResolvedValue({} as any);

      const result = await service.validateKey(rawKey);
      expect(result?.id).toBe('key-1');
    });
  });
});
