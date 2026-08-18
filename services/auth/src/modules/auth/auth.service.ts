import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { authActivityLogRepository } from '@agency-os/database';
import { JwtPayload, AuthResponse } from '@agency-os/types';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export const DEFAULT_JWT_ACCESS_SECRET =
  'd5f8b9e67c8a49c2a12a7f5a3b9d0e1c4b7a8d9e0f1a2b3c4d5e6f7a8b9c0d1e';
export const DEFAULT_JWT_REFRESH_SECRET =
  'a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private generateAccessToken(payload: JwtPayload): string {
    const secret = process.env.JWT_ACCESS_SECRET || DEFAULT_JWT_ACCESS_SECRET;
    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }

  private generateRefreshToken(payload: JwtPayload): string {
    const secret = process.env.JWT_REFRESH_SECRET || DEFAULT_JWT_REFRESH_SECRET;
    return jwt.sign({ sub: payload.sub }, secret, { expiresIn: '7d' });
  }


  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      const inputIdentifier = dto.email.trim().toLowerCase();
      // 1. Find user by email or phone with roles and permissions
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: inputIdentifier }, { phone: dto.email.trim() }],
        },
        include: {
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
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 2. Check brute force block (5+ failed logins in the last 15 minutes)
      // Temporarily disabled - authActivityLogRepository not implemented
      // const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      // const failedAttempts = await authActivityLogRepository.getFailedLoginsSince(user.id, fifteenMinutesAgo);
      //
      // if (failedAttempts >= 5) {
      //   throw new HttpException(
      //     'Too many failed login attempts. Please try again after 15 minutes.',
      //     HttpStatus.TOO_MANY_REQUESTS,
      //   );
      // }

      // 3. Verify password
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        // Log failed login event in MongoDB - temporarily disabled
        // await authActivityLogRepository.logEvent({
        //   userId: user.id,
        //   organizationId: user.organizationId,
        //   event: 'failed_login',
        //   ipAddress,
        //   userAgent,
        //   metadata: { reason: 'invalid_password' },
        // });

        // Re-check failure count for immediate blocking response - temporarily disabled
        // const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        // const updatedFailedAttempts = await authActivityLogRepository.getFailedLoginsSince(user.id, fifteenMinutesAgo);
        // if (updatedFailedAttempts >= 5) {
        //   throw new HttpException(
        //     'Too many failed login attempts. Please try again after 15 minutes.',
        //     HttpStatus.TOO_MANY_REQUESTS,
        //   );
        // }

        throw new UnauthorizedException('Invalid credentials');
      }

      // Single Active Session Enforcement: Revoke ALL existing active refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revoked: false },
        data: { revoked: true },
      });

      // 4. Construct JWT Payload
      const permissionsList = Array.from(
        new Set(
          user.roles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.action),
          ),
        ),
      );

      const rolesList = user.roles.map((ur) => ur.role.name);

      const jwtPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        orgId: user.organizationId,
        roles: rolesList,
        permissions: permissionsList,
      };

      // 5. Generate Tokens
      const accessToken = this.generateAccessToken(jwtPayload);
      const refreshToken = this.generateRefreshToken(jwtPayload);

      // Save refresh token to Postgres
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          revoked: false,
        },
      });

      // 6. Log successful login to MongoDB (optional/safe)
      try {
        await authActivityLogRepository.logEvent({
          userId: user.id,
          organizationId: user.organizationId,
          event: 'login',
          ipAddress,
          userAgent,
        });
      } catch (err) {
        console.warn('Could not log login event to MongoDB:', err);
      }

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          organizationId: user.organizationId,
          roles: rolesList,
          permissions: permissionsList,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    } catch (e) {
      console.error('LOGIN ERROR:', e);
      throw e;
    }
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const slug = dto.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const org = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
        slug: `${slug}-${Date.now()}`,
      },
    });

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name,
        password: hashedPassword,
        organizationId: org.id,
        isActive: true,
        mustChangePassword: false,
      },
    });

    let adminRole = await this.prisma.role.findUnique({
      where: { name: 'admin' },
    });
    if (!adminRole) {
      adminRole = await this.prisma.role.create({
        data: { name: 'admin', description: 'Administrator' },
      });
    }

    await this.prisma.userRole.create({
      data: { userId: user.id, roleId: adminRole.id },
    });

    const allPermissions = await this.prisma.permission.findMany();
    for (const perm of allPermissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }

    const permissionsList = allPermissions.map((p) => p.action);
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      roles: ['admin'],
      permissions: permissionsList,
    };

    const accessToken = this.generateAccessToken(jwtPayload);
    const refreshToken = this.generateRefreshToken(jwtPayload);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
      },
    });

    try {
      await authActivityLogRepository.logEvent({
        userId: user.id,
        organizationId: user.organizationId,
        event: 'login',
      });
    } catch (err) {
      console.warn('Could not log registration event to MongoDB:', err);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        organizationId: user.organizationId,
        roles: ['admin'],
        permissions: permissionsList,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  async logout(refreshTokenString?: string): Promise<{ success: boolean }> {
    if (!refreshTokenString) {
      return { success: true };
    }

    try {
      const dbToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshTokenString },
      });

      if (dbToken) {
        // Log logout event in MongoDB
        const user = await this.prisma.user.findUnique({
          where: { id: dbToken.userId },
        });
        if (user) {
          try {
            await authActivityLogRepository.logEvent({
              userId: user.id,
              organizationId: user.organizationId,
              event: 'logout',
            });
          } catch (err) {
            console.warn('Could not log logout event to MongoDB:', err);
          }
        }

        // Delete refresh token
        await this.prisma.refreshToken.delete({
          where: { id: dbToken.id },
        });
      }
    } catch (err) {
      console.warn('Error revoking token on logout:', err);
    }

    return { success: true };
  }


  async refresh(
    dto: RefreshDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verify token exists in database
    const dbToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: {
        user: {
          include: {
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
          },
        },
      },
    });

    if (!dbToken || dbToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (dbToken.revoked) {
      throw new UnauthorizedException('SESSION_SUPERSEDED');
    }

    const user = dbToken.user;

    // 2. Generate new JWT Payload
    const permissionsList = Array.from(
      new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.action),
        ),
      ),
    );

    const rolesList = user.roles.map((ur) => ur.role.name);

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      roles: rolesList,
      permissions: permissionsList,
    };

    // 3. Rotate Tokens (delete old, create new)
    await this.prisma.refreshToken.delete({ where: { id: dbToken.id } });

    const newAccessToken = this.generateAccessToken(jwtPayload);
    const newRefreshToken = this.generateRefreshToken(jwtPayload);

    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        revoked: false,
      },
    });

    // 4. Log refresh event to MongoDB
    try {
      await authActivityLogRepository.logEvent({
        userId: user.id,
        organizationId: user.organizationId,
        event: 'refresh',
        ipAddress,
        userAgent,
      });
    } catch (err) {
      console.warn('Could not log refresh event to MongoDB:', err);
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async changePassword(
    userId: string,
    dto: { currentPassword?: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.mustChangePassword === false && dto.currentPassword) {
      const isPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    if (
      !dto.newPassword ||
      dto.newPassword.length < 8 ||
      !/\d/.test(dto.newPassword)
    ) {
      throw new HttpException(
        'Password must be at least 8 characters long and contain at least one number',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissionsList = Array.from(
      new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.action),
        ),
      ),
    );

    const rolesList = user.roles.map((ur) => ur.role.name);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      organizationId: user.organizationId,
      roles: rolesList,
      permissions: permissionsList,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async getUserActivity(userId: string): Promise<any[]> {
    return authActivityLogRepository.getRecentActivity(userId, 20);
  }

  // Exchange Code Pattern for Cross-Domain Auth
  async generateExchangeCode(
    userId: string,
    organizationId: string,
  ): Promise<string> {
    const code = jwt.sign(
      { sub: userId, orgId: organizationId },
      process.env.JWT_ACCESS_SECRET || DEFAULT_JWT_ACCESS_SECRET,
      { expiresIn: '120s' },
    );

    // Try to store in cache for single-use enforcement (best-effort)
    try {
      await this.cacheManager.set(
        `exchange_code:${code}`,
        { userId, organizationId },
        120,
      );
    } catch (err) {
      console.warn(
        '[Auth] Cache set failed for exchange code, continuing without cache:',
        err?.message,
      );
    }

    return code;
  }

  async exchangeCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    let userId: string;
    let organizationId: string;

    // First try cache (for single-use enforcement)
    try {
      const cachedData = await this.cacheManager.get(`exchange_code:${code}`);
      if (cachedData) {
        userId = (cachedData as any).userId;
        organizationId = (cachedData as any).organizationId;
        // Delete from cache (single-use)
        await this.cacheManager.del(`exchange_code:${code}`);
      } else {
        // Cache miss — fall back to JWT verification
        console.warn(
          '[Auth] Exchange code not in cache, falling back to JWT verification',
        );
        const secret = process.env.JWT_ACCESS_SECRET || DEFAULT_JWT_ACCESS_SECRET;
        const payload = jwt.verify(code, secret) as any;
        userId = payload.sub;
        organizationId = payload.orgId;
      }
    } catch (cacheErr) {
      // Cache error — try JWT verification directly
      console.warn(
        '[Auth] Cache error, falling back to JWT verification:',
        cacheErr?.message,
      );
      try {
        const secret = process.env.JWT_ACCESS_SECRET || DEFAULT_JWT_ACCESS_SECRET;
        const payload = jwt.verify(code, secret) as any;
        userId = payload.sub;
        organizationId = payload.orgId;
      } catch (jwtErr) {
        throw new UnauthorizedException('Invalid or expired exchange code');
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired exchange code');
    }

    // Get user with roles and permissions
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Construct JWT Payload
    const permissionsList = Array.from(
      new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.action),
        ),
      ),
    );

    const rolesList = user.roles.map((ur) => ur.role.name);

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      roles: rolesList,
      permissions: permissionsList,
    };

    // Generate Tokens
    const accessToken = this.generateAccessToken(jwtPayload);
    const refreshToken = this.generateRefreshToken(jwtPayload);

    // Save refresh token to Postgres
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        revoked: false,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        organizationId: user.organizationId,
        roles: rolesList,
        permissions: permissionsList,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }
}
