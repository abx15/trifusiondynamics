import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
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
    const defaultTempPassword =
      process.env.DEFAULT_TEMP_PASSWORD || 'Welcome@123';
    const tempPassword = defaultTempPassword;
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

    // Log user creation (no individual password - uses shared default)
    console.log(
      `[USER PROVISIONED] Email: ${user.email} | Role: ${dto.role} | All new accounts use default password: ${tempPassword} (must change on first login)`,
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

  async listUsers(orgId?: string, isSuperAdmin = false) {
    return this.prisma.user.findMany({
      where: isSuperAdmin ? {} : orgId ? { organizationId: orgId } : {},
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

  async listOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrganization(data: { name: string; slug: string }) {
    const slug = data.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');
    return this.prisma.organization.create({
      data: {
        name: data.name,
        slug: `${slug}-${Date.now()}`,
      },
    });
  }

  async listRoles() {
    return this.prisma.role.findMany({
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
    });
  }
}
