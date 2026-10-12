import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { JwtPayload } from '@agency-os/types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('User session not found');
    }

    // Superadmin roles have full access across all organizations
    const superAdminRoles = ['superadmin', 'super_admin'];
    const isSuperAdmin = user.roles?.some((role) =>
      superAdminRoles.includes(role.toLowerCase()),
    );
    if (isSuperAdmin) {
      return true;
    }

    // Admin roles have full access WITHIN their own organization only
    // The actual organization scoping is enforced in the service layer
    // by filtering queries with user.orgId
    const adminRoles = ['admin', 'superadmin', 'super_admin'];
    if (user.roles && adminRoles.some((role) => user.roles.includes(role))) {
      // Admin can access - organization scoping handled in services
      return true;
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions?.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
