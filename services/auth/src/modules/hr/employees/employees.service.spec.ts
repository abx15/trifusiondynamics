import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('EmployeesService (P1: tenant isolation + pagination)', () => {
  let service: EmployeesService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<EmployeesService>(EmployeesService);
  });

  it('scopes findAll to the requested organizationId', async () => {
    prismaMock.employee.count.mockResolvedValue(0);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.salaryStructure.findMany.mockResolvedValue([]);

    await service.findAll('org-A', undefined, undefined, 1, 10);

    const where = prismaMock.employee.findMany.mock.calls[0][0]?.where;
    expect(where.organizationId).toBe('org-A');
  });

  it('caps the per-page limit at the module max (200)', async () => {
    prismaMock.employee.count.mockResolvedValue(0);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.salaryStructure.findMany.mockResolvedValue([]);

    await service.findAll('org-A', undefined, undefined, 1, 99999);

    const args = prismaMock.employee.findMany.mock.calls[0][0];
    expect(args.take).toBeLessThanOrEqual(200);
  });
});
