import * as jwt from 'jsonwebtoken';

// Use the same JWT secret used by the NestJS app (or standard 'secret' for tests)
const JWT_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  'd5f8b9e67c8a49c2a12a7f5a3b9d0e1c4b7a8d9e0f1a2b3c4d5e6f7a8b9c0d1e';

// Define permissions for each role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'crm:read',
    'crm:write',
    'crm:delete',
    'projects:read',
    'projects:write',
    'projects:delete',
    'hr:read',
    'hr:write',
    'hr:delete',
    'billing:read',
    'billing:write',
    'billing:delete',
    'ai:read',
    'ai:write',
    'analytics:read',
    'analytics:write',
    'automation:read',
    'automation:write',
    'automation:delete',
    'developer:read',
    'developer:write',
    'developer:delete',
    'users:read',
    'users:write',
    'users:delete',
  ],
  employee: [
    'crm:read',
    'projects:read',
    'projects:write',
    'hr:read',
    'ai:read',
    'ai:write',
    'analytics:read',
  ],
  client: ['projects:read', 'billing:read'],
};

export function getAuthToken(role: 'admin' | 'employee' | 'client'): string {
  const permissions = ROLE_PERMISSIONS[role] || [];

  const payload: any = {
    sub: `${role}-user-id`,
    email: `${role}@test.com`,
    orgId: 'test-org-id',
    roles: [role],
    permissions: permissions,
  };

  if (role === 'client') {
    payload.linkedClientId = 'client-record-id';
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}
