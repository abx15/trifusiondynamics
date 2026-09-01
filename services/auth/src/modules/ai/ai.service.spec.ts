import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AiService', () => {
  let prismaMock: DeepMockProxy<PrismaService>;
  let httpMock: DeepMockProxy<HttpService>;
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaService>();
    httpMock = mockDeep<HttpService>();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const buildService = async (): Promise<{
    module: TestingModule;
    service: AiService;
  }> => {
    const module = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: HttpService, useValue: httpMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    return {
      module,
      service: module.get<AiService>(AiService),
    };
  };

  describe('construction', () => {
    it('does NOT throw in production if AI_SERVICE_SECRET is missing (graceful degradation)', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AI_SERVICE_SECRET;

      const { service } = await buildService();
      expect(service).toBeDefined();
    });

    it('initializes in development even without AI_SERVICE_SECRET', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.AI_SERVICE_SECRET;

      const { service } = await buildService();
      expect(service).toBeDefined();
    });

    it('initializes in production when AI_SERVICE_SECRET is set', async () => {
      process.env.NODE_ENV = 'production';
      process.env.AI_SERVICE_SECRET = 'a-very-long-secret-key-for-testing';

      const { service } = await buildService();
      expect(service).toBeDefined();
    });
  });

  describe('ensureConfigured guard', () => {
    it('returns 503 when AI is called without configuration', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AI_SERVICE_SECRET;

      const { service } = await buildService();

      await expect(
        service.generateProposal('user-1', 'org-1', { requirements: 'test' }),
      ).rejects.toThrow(HttpException);
    });

    it('returns 503 for auditWebsite when unconfigured', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AI_SERVICE_SECRET;

      const { service } = await buildService();

      await expect(
        service.auditWebsite('user-1', 'org-1', {
          websiteUrl: 'https://example.com',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('returns 503 for chat when unconfigured', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AI_SERVICE_SECRET;

      const { service } = await buildService();

      await expect(
        service.chat('user-1', { message: 'hello', conversationHistory: [] }),
      ).rejects.toThrow(HttpException);
    });

    it('does not throw 503 for history endpoints (DB-only)', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AI_SERVICE_SECRET;

      const { service, module } = await buildService();
      prismaMock.aiProposalRequest.findMany.mockResolvedValue([]);

      const result = await service.getProposalHistory('org-1');
      expect(result).toEqual([]);

      await module.close();
    });
  });
});
