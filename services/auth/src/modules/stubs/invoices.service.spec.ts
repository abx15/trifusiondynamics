import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let dbMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    dbMock = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: dbMock },
      ],
    }).compile();
    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('createInvoice', () => {
    it('should calculate GST properly', async () => {
      dbMock.invoice.create.mockImplementation((args: any) => args.data);
      const result = await service.createInvoice({ subtotal: 1000 });
      expect(result.total).toBe(1180);
    });
  });
});
