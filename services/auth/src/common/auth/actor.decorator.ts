import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '@agency-os/types';

/**
 * Canonical authorization context for a request.
 *
 * `organizationId` is derived from the verified JWT only. It is never read from
 * a body, query string or path parameter, which is what makes tenant isolation
 * enforceable rather than advisory.
 */
export interface ActorContext {
  userId: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  /** Present only for users holding the `client` role. */
  linkedClientId?: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isClient: boolean;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

const SUPER_ADMIN_ROLES = new Set(['superadmin', 'super_admin']);
const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin']);
const AGENT_ROLES = new Set([
  'agent',
  'support_agent',
  'sales_agent',
  'hr_agent',
  'admin',
  'superadmin',
  'super_admin',
]);
const CLIENT_ROLES = new Set(['client']);

/**
 * Express's `Request` does not know about the `user` property that
 * `JwtAuthGuard` attaches, nor the request id installed in `main.ts`.
 */
type AuthenticatedRequest = Request & {
  user?: JwtPayload;
  id?: string;
};

function hasRole(roles: string[], candidates: Set<string>): boolean {
  return roles.some((role) => candidates.has(role.toLowerCase()));
}

export function buildActorContext(
  payload: JwtPayload | undefined,
  request?: AuthenticatedRequest,
): ActorContext {
  const roles = payload?.roles ?? [];
  const requestIdHeader = request?.headers?.['x-request-id'];
  return {
    userId: payload?.sub ?? '',
    organizationId: payload?.orgId ?? '',
    roles,
    permissions: payload?.permissions ?? [],
    isSuperAdmin: hasRole(roles, SUPER_ADMIN_ROLES),
    isAdmin: hasRole(roles, ADMIN_ROLES),
    isAgent: hasRole(roles, AGENT_ROLES),
    isClient: hasRole(roles, CLIENT_ROLES),
    email: payload?.email ?? '',
    ipAddress: request?.ip,
    userAgent: request?.headers?.['user-agent'],
    requestId:
      typeof requestIdHeader === 'string'
        ? requestIdHeader
        : typeof request?.id === 'string'
          ? request.id
          : undefined,
  };
}

/** Injects the resolved {@link ActorContext} into a controller handler. */
export const Actor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return buildActorContext(request.user, request);
  },
);
