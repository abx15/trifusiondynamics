import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('AiService (P1: AI_SERVICE_SECRET enforcement)', () => {
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

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: HttpService, useValue: httpMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    return module.get<AiService>(AiService);
  };

  it('throws in production if AI_SERVICE_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AI_SERVICE_SECRET;
    await expect(buildService()).rejects.toThrow(/AI_SERVICE_SECRET/);
  });

  it('initializes in development even without AI_SERVICE_SECRET', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.AI_SERVICE_SECRET;
    const svc = await buildService();
    expect(svc).toBeDefined();
  });
});
