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
import { JwtPayload, AuthResponse } from '@agency-os/types';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RedisService } from '../database/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private redis: RedisService,
  ) {}

  private getJwtSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is not set');
    }
    return secret;
  }

  private getJwtRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }
    return secret;
  }

  private generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.getJwtSecret(), { expiresIn: '1h' });
  }

  private generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign({ sub: payload.sub }, this.getJwtRefreshSecret(), {
      expiresIn: '7d',
    });
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      const inputIdentifier = dto.email.trim().toLowerCase();
      // 1. Find user by email or phone
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: inputIdentifier }, { phone: inputIdentifier }],
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

      if (!user.isActive) {
        throw new UnauthorizedException('Your account has been deactivated');
      }

      // 2. Check brute force block (5+ failed logins in the last 15 minutes)
      // Note: MongoDB-based activity logging removed, skipping brute force check

      // 3. Verify password
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 4. Enforce password change if required
      if (user.mustChangePassword) {
        throw new HttpException(
          'You must change your password before continuing',
          HttpStatus.FORBIDDEN,
        );
      }

      // 5. Single Active Session Enforcement: Revoke ALL existing active refresh tokens
      //    and issue a new one — both must succeed atomically to avoid a state where
      //    the user is logged out of every session but has no new session.
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

      const accessToken = this.generateAccessToken(jwtPayload);
      const refreshToken = this.generateRefreshToken(jwtPayload);

      await this.prisma.$transaction(async (tx) => {
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revoked: false },
          data: { revoked: true },
        });

        await tx.refreshToken.create({
          data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revoked: false,
          },
        });
      });

      // 9. Log successful login (MongoDB removed, skipping)
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
    const orgSlug = `${slug}-${Date.now()}`;

    // Wrap org creation, user creation, role assignment, and refresh-token
    // materialization in a single transaction so a partial failure cannot leave
    // an org without an admin user.
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: orgSlug,
        },
      });

      const hashedPassword = await bcrypt.hash(dto.password, 12);
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          name: dto.name,
          password: hashedPassword,
          organizationId: org.id,
          isActive: true,
          mustChangePassword: false,
        },
      });

      let adminRole = await tx.role.findUnique({ where: { name: 'admin' } });
      if (!adminRole) {
        adminRole = await tx.role.create({
          data: { name: 'admin', description: 'Administrator' },
        });
      }

      await tx.userRole.create({
        data: { userId: user.id, roleId: adminRole.id },
      });

      const allPermissions = await tx.permission.findMany();
      for (const perm of allPermissions) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: perm.id,
            },
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

      await tx.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
          roles: ['admin'],
          permissions: permissionsList,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    });
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

    // 3. Rotate Tokens (delete old, create new) — atomic transaction ensures
    //    the old token is revoked and the new one is issued together, so a
    //    crash between the two steps cannot strand the user without a session.
    const newAccessToken = this.generateAccessToken(jwtPayload);
    const newRefreshToken = this.generateRefreshToken(jwtPayload);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({ where: { id: dbToken.id } });

      await tx.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          revoked: false,
        },
      });
    });

    // 4. Log refresh event (MongoDB removed, skipping)
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
    // MongoDB removed, return empty array
    return [];
  }

  // Exchange Code Pattern for Cross-Domain Auth
  async generateExchangeCode(
    userId: string,
    organizationId: string,
  ): Promise<string> {
    const code = jwt.sign(
      { sub: userId, orgId: organizationId },
      this.getJwtSecret(),
      { expiresIn: '120s' },
    );

    // Store the code with a TTL in Redis (distributed + single-use).
    // Fall back to the in-memory cache if Redis is unavailable.
    try {
      const stored = await this.redis.set(
        `code:${code}`,
        JSON.stringify({ userId, organizationId }),
        120,
      );
      if (!stored) {
        await this.cacheManager.set(
          `code:${code}`,
          { userId, organizationId },
          120,
        );
      }
    } catch (err) {
      // Cache failed, continuing without it
    }

    return code;
  }

  async exchangeCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    let userId: string | null = null;
    let organizationId: string | null = null;

    // First try Redis (distributed, single-use), then in-memory cache, then JWT.
    const redisCached = await this.redis.get(`code:${code}`);
    if (redisCached) {
      try {
        const parsed = JSON.parse(redisCached) as {
          userId: string;
          organizationId: string;
        };
        userId = parsed.userId;
        organizationId = parsed.organizationId;
        await this.redis.del(`code:${code}`);
      } catch {
        /* fall through to cache/JWT */
      }
    }

    if (!userId) {
      try {
        const cachedData = await this.cacheManager.get(`code:${code}`);
        if (cachedData) {
          userId = (cachedData as any).userId;
          organizationId = (cachedData as any).organizationId;
          await this.cacheManager.del(`code:${code}`);
        } else {
          // Cache miss — fall back to JWT verification
          const payload = jwt.verify(code, this.getJwtSecret()) as any;
          userId = payload.sub;
          organizationId = payload.orgId;
        }
      } catch (cacheErr) {
        // Cache error — try JWT verification directly
        try {
          const payload = jwt.verify(code, this.getJwtSecret()) as any;
          userId = payload.sub;
          organizationId = payload.orgId;
        } catch (jwtErr) {
          throw new UnauthorizedException('Invalid or expired exchange code');
        }
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
