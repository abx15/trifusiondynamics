import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { BadRequestException } from '@nestjs/common';

describe('LeadsService', () => {
  let service: LeadsService;
  let dbMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    dbMock = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadsService, { provide: PrismaService, useValue: dbMock }],
    }).compile();
    service = module.get<LeadsService>(LeadsService);
  });

  describe('convertToClient', () => {
    it('should create client and update lead status', async () => {
      const mockLead = {
        id: 'lead-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        organizationId: 'org-1',
      };
      const mockClient = { id: expect.any(String), name: 'New Client' };
      dbMock.lead.findFirst.mockResolvedValue(mockLead as any);
      dbMock.client.create.mockResolvedValue(mockClient as any);
      dbMock.lead.update.mockResolvedValue(mockLead as any);

      const result = await service.convertToClient('lead-1');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
    });
  });
});
