import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { type JwtPayload } from '@agency-os/types';

describe('EmployeesController - Download Authorization (P1: IDOR prevention)', () => {
  let controller: EmployeesController;
  let prismaMock: DeepMockProxy<PrismaService>;
  let serviceMock: DeepMockProxy<EmployeesService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    serviceMock = mockDeep<EmployeesService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        { provide: EmployeesService, useValue: serviceMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  const selfUser: JwtPayload = {
    sub: 'user-emp-1',
    email: 'emp@test.com',
    orgId: 'org-A',
    roles: ['employee'],
    permissions: ['hr:read'],
  };

  const hrUser: JwtPayload = {
    sub: 'user-hr-1',
    email: 'hr@test.com',
    orgId: 'org-A',
    roles: ['admin'],
    permissions: ['hr:read', 'hr:write'],
  };

  const otherOrgUser: JwtPayload = {
    sub: 'user-org-b',
    email: 'other@test.com',
    orgId: 'org-B',
    roles: ['employee'],
    permissions: ['hr:read'],
  };

  const noHrReadUser: JwtPayload = {
    sub: 'user-no-hr',
    email: 'no-hr@test.com',
    orgId: 'org-A',
    roles: ['employee'],
    permissions: [],
  };

  const mockEmployee = {
    id: 'emp-1',
    userId: 'user-emp-1',
    employeeCode: 'TFX-EMP-001',
    organizationId: 'org-A',
    department: 'Engineering',
    designation: 'Dev',
    joiningDate: new Date('2024-01-01'),
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    reportingToId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocument = {
    id: 'doc-1',
    employeeId: 'emp-1',
    type: 'offer_letter',
    fileUrl: 'https://storage.example.com/documents/offer-letter.pdf',
    uploadedAt: new Date('2024-06-01'),
  };

  describe('downloadDocument authorization', () => {
    it('should allow self-access (employee viewing own document)', async () => {
      prismaMock.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaMock.employeeDocument.findFirst.mockResolvedValue(mockDocument);

      const result = await controller.downloadDocument(
        'emp-1',
        'doc-1',
        selfUser,
      );

      expect(result.fileUrl).toBe(mockDocument.fileUrl);
      expect(result.type).toBe('offer_letter');
    });

    it('should allow HR user (hr:read) accessing any employee document in same org', async () => {
      prismaMock.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaMock.employeeDocument.findFirst.mockResolvedValue(mockDocument);

      const result = await controller.downloadDocument(
        'emp-1',
        'doc-1',
        hrUser,
      );

      expect(result.fileUrl).toBe(mockDocument.fileUrl);
    });

    it('should block cross-organization access (employee not found in user org)', async () => {
      prismaMock.employee.findFirst.mockResolvedValue(null);

      await expect(
        controller.downloadDocument('emp-1', 'doc-1', otherOrgUser),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.employeeDocument.findFirst.mock.calls).toHaveLength(0);
    });

    it('should block non-HR user accessing another employee document (no self, no hr:read)', async () => {
      const otherEmployee = { ...mockEmployee, userId: 'user-emp-2' };
      prismaMock.employee.findFirst.mockResolvedValue(otherEmployee);
      prismaMock.employeeDocument.findFirst.mockResolvedValue(mockDocument);

      await expect(
        controller.downloadDocument('emp-1', 'doc-1', noHrReadUser),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.employeeDocument.findFirst.mock.calls).toHaveLength(0);
    });

    it('should return 404 when document does not exist', async () => {
      prismaMock.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaMock.employeeDocument.findFirst.mockResolvedValue(null);

      await expect(
        controller.downloadDocument('emp-1', 'nonexistent-doc', selfUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 404 when employee does not exist', async () => {
      prismaMock.employee.findFirst.mockResolvedValue(null);

      await expect(
        controller.downloadDocument('nonexistent-emp', 'doc-1', selfUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
