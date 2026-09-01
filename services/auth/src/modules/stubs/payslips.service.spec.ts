import { Test, TestingModule } from '@nestjs/testing';
import { PayslipsService } from './payslips.service';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('PayslipsService', () => {
  let service: PayslipsService;
  let dbMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    dbMock = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayslipsService,
        { provide: PrismaService, useValue: dbMock },
      ],
    }).compile();
    service = module.get<PayslipsService>(PayslipsService);
  });

  describe('generatePayslip', () => {
    it('should apply 5% tax for gross > 25000', async () => {
      dbMock.payslip.create.mockImplementation((args: any) => args.data);
      const result = await service.generatePayslip({ grossSalary: 30000 });
      expect(result.tax).toBe(1500);
      expect(result.netAmount).toBe(28500);
    });
  });
});
