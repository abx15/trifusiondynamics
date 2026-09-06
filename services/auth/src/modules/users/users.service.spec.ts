import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersService — archiveOrganization', () => {
  let service: UsersService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  const superAdminActor = {
    id: 'admin-uuid',
    email: 'superadmin@test.com',
    roles: ['superadmin'],
  };

  const activeOrg = {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-06-01T00:00:00Z'),
  };

  describe('happy path', () => {
    it('should archive an organization with correct confirmation', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      const txMock = mockDeep<any>();
      const archivedOrg = { ...activeOrg, isActive: false };

      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => {
        return await cb(txMock);
      });

      txMock.organization.update.mockResolvedValue(archivedOrg);
      txMock.user.updateMany.mockResolvedValue({ count: 3 });
      txMock.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.archiveOrganization(
        'org-1',
        { name: 'Acme Corp' },
        superAdminActor,
      );

      expect(result.success).toBe(true);
      expect(result.organization.isActive).toBe(false);
      expect(txMock.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { isActive: false },
      });
    });

    it('should deactivate all active users in the organization', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      const txMock = mockDeep<any>();
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => {
        return await cb(txMock);
      });

      txMock.organization.update.mockResolvedValue({
        ...activeOrg,
        isActive: false,
      });
      txMock.user.updateMany.mockResolvedValue({ count: 3 });
      txMock.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await service.archiveOrganization(
        'org-1',
        { name: 'Acme Corp' },
        superAdminActor,
      );

      expect(txMock.user.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isActive: true },
        data: { isActive: false },
      });
    });

    it('should revoke all active refresh tokens for the organization', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      const txMock = mockDeep<any>();
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => {
        return await cb(txMock);
      });

      txMock.organization.update.mockResolvedValue({
        ...activeOrg,
        isActive: false,
      });
      txMock.user.updateMany.mockResolvedValue({ count: 3 });
      txMock.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await service.archiveOrganization(
        'org-1',
        { name: 'Acme Corp' },
        superAdminActor,
      );

      expect(txMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          user: { organizationId: 'org-1' },
          revoked: false,
        },
        data: { revoked: true },
      });
    });

    it('should NOT delete users, roles, or business records (preserve data)', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      const txMock = mockDeep<any>();
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => {
        return await cb(txMock);
      });

      txMock.organization.update.mockResolvedValue({
        ...activeOrg,
        isActive: false,
      });
      txMock.user.updateMany.mockResolvedValue({ count: 3 });
      txMock.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await service.archiveOrganization(
        'org-1',
        { name: 'Acme Corp' },
        superAdminActor,
      );

      expect(txMock.user.delete).not.toHaveBeenCalled();
      expect(txMock.userRole.deleteMany).not.toHaveBeenCalled();
      expect(txMock.organization.delete).not.toHaveBeenCalled();
    });

    it('should handle organization with zero users (no-op updateMany)', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      const txMock = mockDeep<any>();
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => {
        return await cb(txMock);
      });

      txMock.organization.update.mockResolvedValue({
        ...activeOrg,
        isActive: false,
      });
      txMock.user.updateMany.mockResolvedValue({ count: 0 });
      txMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.archiveOrganization(
        'org-1',
        { name: 'Acme Corp' },
        superAdminActor,
      );

      expect(result.success).toBe(true);
      expect(txMock.user.updateMany).toHaveBeenCalled();
      expect(txMock.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('failure: organization not found', () => {
    it('should throw NotFoundException when org does not exist', async () => {
      prismaMock.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.archiveOrganization(
          'nonexistent-org',
          { name: 'Does Not Exist' },
          superAdminActor,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('failure: already archived', () => {
    it('should throw BadRequestException when org is already archived', async () => {
      const archivedOrg = { ...activeOrg, isActive: false };
      prismaMock.organization.findUnique.mockResolvedValue(archivedOrg);

      await expect(
        service.archiveOrganization(
          'org-1',
          { name: 'Acme Corp' },
          superAdminActor,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('failure: confirmation mismatch', () => {
    it('should throw BadRequestException when confirmation name does not match', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      await expect(
        service.archiveOrganization(
          'org-1',
          { name: 'Wrong Name' },
          superAdminActor,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when confirmation name is missing', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      await expect(
        service.archiveOrganization('org-1', { name: '' }, superAdminActor),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when confirmation body is missing', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      await expect(
        service.archiveOrganization('org-1', undefined as any, superAdminActor),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('transaction rollback', () => {
    it('should rollback all changes if user updateMany fails', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      const txMock = mockDeep<any>();
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => {
        await cb(txMock);
        throw new Error('Transaction failed — simulated rollback');
      });

      txMock.organization.update.mockResolvedValue({
        ...activeOrg,
        isActive: false,
      });
      txMock.user.updateMany.mockResolvedValue({ count: 3 });
      txMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.archiveOrganization(
          'org-1',
          { name: 'Acme Corp' },
          superAdminActor,
        ),
      ).rejects.toThrow('Transaction failed — simulated rollback');

      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should not partially modify data when transaction fails', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ ...activeOrg });

      const txMock = mockDeep<any>();
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => {
        await cb(txMock);
        throw new Error('Simulated failure after partial writes');
      });

      txMock.organization.update.mockResolvedValue({
        ...activeOrg,
        isActive: false,
      });
      txMock.user.updateMany.mockResolvedValue({ count: 3 });
      txMock.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await expect(
        service.archiveOrganization(
          'org-1',
          { name: 'Acme Corp' },
          superAdminActor,
        ),
      ).rejects.toThrow('Simulated failure after partial writes');
    });
  });

  describe('listOrganizations — archived filtering', () => {
    it('should only return active organizations (isActive: true)', async () => {
      (prismaMock.$transaction as any).mockImplementation(
        async (queries: any[]) => {
          return [queries[0], queries[1]];
        },
      );

      prismaMock.organization.findMany.mockResolvedValue([]);
      prismaMock.organization.count.mockResolvedValue(0);

      await service.listOrganizations();

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
      expect(prismaMock.organization.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });
});
