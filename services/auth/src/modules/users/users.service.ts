import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  parsePagination,
  paginatedResult,
} from '../../common/utils/pagination';
import { type OrganizationResponse } from '@agency-os/types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async createUserByAdmin(dto: CreateUserDto, currentOrgId?: string) {
    // 1. Check if user already exists
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase().trim() },
          ...(dto.phone ? [{ phone: dto.phone.trim() }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    // 2. Determine Organization ID
    let orgId = dto.organizationId || currentOrgId;
    if (!orgId) {
      const defaultOrg = await this.prisma.organization.findFirst();
      if (!defaultOrg) {
        throw new NotFoundException('No default organization found');
      }
      orgId = defaultOrg.id;
    }

    // 3. Use shared default temporary password from environment
    const tempPassword = process.env.DEFAULT_TEMP_PASSWORD;
    if (!tempPassword) {
      throw new Error('DEFAULT_TEMP_PASSWORD environment variable must be set');
    }
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // 4. Create User Record
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        name: dto.name,
        password: hashedPassword,
        mustChangePassword: true,
        organizationId: orgId,
        linkedClientId: dto.linkedClientId || null,
      },
    });

    // 5. Role Assignment
    let role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });

    // Fallback mapping if custom role string passed
    if (!role) {
      role =
        (await this.prisma.role.findUnique({
          where: { name: 'agent' },
        })) || (await this.prisma.role.findFirst());
    }

    if (role) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    // 6. Custom Permissions Assignment (if permissions array provided)
    if (dto.permissions && dto.permissions.length > 0 && role) {
      for (const permAction of dto.permissions) {
        const perm = await this.prisma.permission.upsert({
          where: { action: permAction },
          update: {},
          create: { action: permAction },
        });

        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }

    // Log user creation (no password logged — uses shared default)
    console.log(
      `[USER PROVISIONED] Email: ${user.email} | Role: ${dto.role} | Must change password on first login`,
    );

    // Return created user WITHOUT password
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: dto.role,
      mustChangePassword: user.mustChangePassword,
      linkedClientId: user.linkedClientId,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
    };
  }

  async listUsers(
    orgId?: string,
    isSuperAdmin = false,
    page?: number,
    limit?: number,
  ) {
    const { skip, take } = parsePagination(page, limit);
    return this.prisma.user.findMany({
      where: isSuperAdmin ? {} : orgId ? { organizationId: orgId } : {},
      skip,
      take,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        linkedClientId: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateUser(id: string, orgId: string, dto: any, isSuperAdmin = false) {
    const user = await this.prisma.user.findFirst({
      where: isSuperAdmin ? { id } : { id, organizationId: orgId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined)
      updateData.email = dto.email.toLowerCase().trim();
    if (dto.phone !== undefined) updateData.phone = dto.phone?.trim() || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.mustChangePassword !== undefined)
      updateData.mustChangePassword = dto.mustChangePassword;
    if (dto.linkedClientId !== undefined)
      updateData.linkedClientId = dto.linkedClientId || null;
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 12);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        linkedClientId: true,
        organizationId: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (dto.roles !== undefined && Array.isArray(dto.roles)) {
      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });

      for (const roleName of dto.roles) {
        const role = await this.prisma.role.findUnique({
          where: { name: roleName },
        });

        if (role) {
          await this.prisma.userRole.create({
            data: { userId: id, roleId: role.id },
          });
        }
      }
    }

    return updatedUser;
  }

  async approveUser(
    id: string,
    orgId: string,
    roles: string[],
    isSuperAdmin = false,
  ) {
    const user = await this.prisma.user.findFirst({
      where: isSuperAdmin ? { id } : { id, organizationId: orgId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate temporary password
    const tempPassword = process.env.DEFAULT_TEMP_PASSWORD;
    if (!tempPassword) {
      throw new Error('DEFAULT_TEMP_PASSWORD environment variable must be set');
    }
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Activate user and set temporary password
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          isActive: true,
          mustChangePassword: true,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isActive: true,
          mustChangePassword: true,
          linkedClientId: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Remove existing roles
      await tx.userRole.deleteMany({
        where: { userId: id },
      });

      // Assign new roles
      for (const roleName of roles) {
        const role = await tx.role.findUnique({
          where: { name: roleName },
        });

        if (role) {
          await tx.userRole.create({
            data: { userId: id, roleId: role.id },
          });
        }
      }

      return updated;
    });

    this.logger.log(
      `[USER APPROVED] Email: ${user.email} | Roles: ${roles.join(', ')} | By Admin`,
    );

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      isActive: updatedUser.isActive,
      mustChangePassword: updatedUser.mustChangePassword,
      linkedClientId: updatedUser.linkedClientId,
      organizationId: updatedUser.organizationId,
      tempPassword: tempPassword, // Return temp password for admin to share with user
      roles: roles,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async deleteUser(id: string, orgId: string, isSuperAdmin = false) {
    const user = await this.prisma.user.findFirst({
      where: isSuperAdmin ? { id } : { id, organizationId: orgId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.userRole.deleteMany({
      where: { userId: id },
    });

    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true, message: 'User deleted successfully' };
  }

  async listOrganizations(page?: number, limit?: number) {
    const { skip, take } = parsePagination(page, Math.min(limit ?? 100, 100));
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.organization.count({ where: { isActive: true } }),
    ]);
    return paginatedResult(data, total, Math.floor(skip / take) + 1, take);
  }

  async createOrganization(data: {
    name: string;
    slug: string;
    adminEmail?: string;
    adminName?: string;
    adminPassword?: string;
  }) {
    const slug = data.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');

    // Atomically create the organization AND its first admin user (if provided).
    // Every organization gets its own admin login so tenant admins can operate
    // their own workspace without leaking into other organizations.
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug: `${slug}-${Date.now()}`,
          isActive: true,
        },
      });

      let adminUser: any = null;
      if (data.adminEmail && data.adminName && data.adminPassword) {
        const hashedPassword = await bcrypt.hash(data.adminPassword, 12);
        adminUser = await tx.user.create({
          data: {
            email: data.adminEmail.toLowerCase().trim(),
            name: data.adminName,
            password: hashedPassword,
            organizationId: org.id,
            isActive: true,
            mustChangePassword: false,
          },
        });

        // Assign the organization `admin` role
        const adminRole = await tx.role.findUnique({
          where: { name: 'admin' },
        });
        if (adminRole) {
          await tx.userRole.create({
            data: { userId: adminUser.id, roleId: adminRole.id },
          });
        }
      }

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        isActive: org.isActive,
        createdAt: org.createdAt.toISOString(),
        admin: adminUser
          ? {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name,
              role: 'admin',
              mustChangePassword: false,
            }
          : null,
      };
    });
  }

  async getSuperAdminStats() {
    const [totalOrganizations, activeOrganizations, totalUsers] =
      await this.prisma.$transaction([
        this.prisma.organization.count(),
        this.prisma.organization.count({ where: { isActive: true } }),
        this.prisma.user.count(),
      ]);

    // Simple health check for services (can be enhanced with actual health endpoints)
    const servicesHealth = {
      auth: true, // API is running if this endpoint is reached
      ai: process.env.AI_SERVICE_URL ? true : false,
      database: true, // Prisma connection is working
      redis: process.env.REDIS_URL ? true : false,
    };

    return {
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      servicesHealth,
    };
  }

  async archiveOrganization(
    orgId: string,
    confirmation: { name: string },
    actor: { id: string; email: string; roles: string[] },
  ): Promise<{
    success: boolean;
    message: string;
    organization: OrganizationResponse;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (!org.isActive) {
      throw new BadRequestException('Organization is already archived');
    }

    if (!confirmation?.name || confirmation.name !== org.name) {
      throw new BadRequestException(
        'Confirmation required: the organization name must match to archive',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedOrg = await tx.organization.update({
        where: { id: orgId },
        data: { isActive: false },
      });

      await tx.user.updateMany({
        where: { organizationId: orgId, isActive: true },
        data: { isActive: false },
      });

      await tx.refreshToken.updateMany({
        where: {
          user: { organizationId: orgId },
          revoked: false,
        },
        data: { revoked: true },
      });

      return updatedOrg;
    });

    this.logger.log(
      `Organization archived — id=${result.id} name="${result.slug}" by actor=${actor.email}`,
    );

    return {
      success: true,
      message: 'Organization archived successfully',
      organization: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        isActive: false,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    };
  }

  async reactivateOrganization(
    orgId: string,
    actor: { id: string; email: string; roles: string[] },
  ): Promise<{
    success: boolean;
    message: string;
    organization: OrganizationResponse;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (org.isActive) {
      throw new BadRequestException('Organization is already active');
    }

    const result = await this.prisma.organization.update({
      where: { id: orgId },
      data: { isActive: true },
    });

    this.logger.log(
      `Organization reactivated — id=${result.id} name="${result.slug}" by actor=${actor.email}`,
    );

    return {
      success: true,
      message: 'Organization reactivated successfully',
      organization: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        isActive: true,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    };
  }

  async getOrganizationDetails(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            roles: {
              select: {
                role: { select: { name: true } },
              },
            },
            createdAt: true,
          },
          take: 20,
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Flatten the UserRole join rows into plain role-name strings
    const users = org.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles.map((r) => r.role.name),
      createdAt: u.createdAt,
    }));

    // Get additional stats from different schemas
    const [ticketStats, projectStats, invoiceStats, clientCount, leadCount, employeeCount] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      this.prisma.client.count({ where: { organizationId: orgId } }),
      this.prisma.lead.count({ where: { organizationId: orgId } }),
      this.prisma.employee.count({ where: { organizationId: orgId } }),
    ]);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      counts: {
        users: org._count.users,
        clients: clientCount,
        projects: projectStats.reduce((s, p) => s + p._count.id, 0),
        tickets: ticketStats.reduce((s, t) => s + t._count.id, 0),
        invoices: invoiceStats.reduce((s, i) => s + i._count.id, 0),
        leads: leadCount,
        employees: employeeCount,
      },
      users,
      stats: {
        tickets: ticketStats,
        projects: projectStats,
        invoices: invoiceStats,
      },
    };
  }

  async listRoles(page?: number, limit?: number) {
    const { skip, take } = parsePagination(page, Math.min(limit ?? 100, 100));
    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.role.count(),
    ]);
    return paginatedResult(data, total, Math.floor(skip / take) + 1, take);
  }
}
