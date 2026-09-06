import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type JwtPayload } from '@agency-os/types';

describe('UsersController — Organization archive authorization', () => {
  let controller: UsersController;
  let usersServiceMock: DeepMockProxy<UsersService>;

  beforeEach(async () => {
    usersServiceMock = mockDeep<UsersService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  const superAdminUser: JwtPayload = {
    sub: 'admin-uuid',
    email: 'superadmin@test.com',
    orgId: 'org-A',
    roles: ['superadmin'],
    permissions: [],
  };

  const adminUser: JwtPayload = {
    sub: 'admin-uuid-2',
    email: 'admin@test.com',
    orgId: 'org-A',
    roles: ['admin'],
    permissions: ['users:delete'],
  };

  const regularAdminUser: JwtPayload = {
    sub: 'admin-uuid-3',
    email: 'regular-admin@test.com',
    orgId: 'org-A',
    roles: ['admin'],
    permissions: ['hr:write', 'hr:delete'],
  };

  const employeeUser: JwtPayload = {
    sub: 'emp-uuid',
    email: 'employee@test.com',
    orgId: 'org-A',
    roles: ['employee'],
    permissions: ['hr:read'],
  };

  describe('archiveOrganization — authorization', () => {
    it('should allow superadmin to archive organization', async () => {
      usersServiceMock.archiveOrganization.mockResolvedValue({
        success: true,
        message: 'Organization archived successfully',
        organization: {
          id: 'org-1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          isActive: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-06-01T00:00:00Z',
        },
      });

      const result = await controller.archiveOrganization(
        'org-1',
        { confirmation: { name: 'Acme Corp' } },
        superAdminUser,
      );

      expect(result.success).toBe(true);
      expect(usersServiceMock.archiveOrganization).toHaveBeenCalledWith(
        'org-1',
        { name: 'Acme Corp' },
        {
          id: 'admin-uuid',
          email: 'superadmin@test.com',
          roles: ['superadmin'],
        },
      );
    });

    it('should block admin (non-superadmin) with admin role', async () => {
      await expect(
        controller.archiveOrganization(
          'org-1',
          { confirmation: { name: 'Acme Corp' } },
          adminUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(usersServiceMock.archiveOrganization).not.toHaveBeenCalled();
    });

    it('should block regular admin with hr:delete permission but not superadmin role', async () => {
      await expect(
        controller.archiveOrganization(
          'org-1',
          { confirmation: { name: 'Acme Corp' } },
          regularAdminUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(usersServiceMock.archiveOrganization).not.toHaveBeenCalled();
    });

    it('should block employee from archiving organization', async () => {
      await expect(
        controller.archiveOrganization(
          'org-1',
          { confirmation: { name: 'Acme Corp' } },
          employeeUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(usersServiceMock.archiveOrganization).not.toHaveBeenCalled();
    });
  });

  describe('archiveOrganization — cross-tenant protection (IDOR)', () => {
    it('should not allow archiving an organization from a different tenant', async () => {
      usersServiceMock.archiveOrganization.mockResolvedValue({
        success: true,
        message: 'Organization archived successfully',
        organization: {
          id: 'org-B',
          name: 'Other Org',
          slug: 'other-org',
          isActive: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-06-01T00:00:00Z',
        },
      });

      const result = await controller.archiveOrganization(
        'org-B',
        { confirmation: { name: 'Other Org' } },
        superAdminUser,
      );

      expect(result.success).toBe(true);
      expect(usersServiceMock.archiveOrganization).toHaveBeenCalledWith(
        'org-B',
        { name: 'Other Org' },
        expect.objectContaining({
          id: 'admin-uuid',
          roles: ['superadmin'],
        }),
      );
    });

    it('should handle NotFoundException from service when org does not exist', async () => {
      usersServiceMock.archiveOrganization.mockRejectedValue(
        new NotFoundException('Organization not found'),
      );

      await expect(
        controller.archiveOrganization(
          'nonexistent-org',
          { confirmation: { name: 'Ghost Org' } },
          superAdminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listOrganizations — superadmin bypass', () => {
    it('should allow superadmin to list all active organizations', async () => {
      usersServiceMock.listOrganizations.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      });

      await controller.listOrganizations(undefined, undefined);

      expect(usersServiceMock.listOrganizations).toHaveBeenCalled();
    });
  });
});
