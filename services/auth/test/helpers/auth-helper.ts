import * as jwt from 'jsonwebtoken';

// Use the same JWT secret used by the NestJS app (or standard 'secret' for tests)
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

export function getAuthToken(role: 'admin' | 'employee' | 'client'): string {
  const payload: any = {
    userId: `${role}-user-id`,
    email: `${role}@test.com`,
    organizationId: 'test-org-id',
    roles: [role],
  };

  if (role === 'client') {
    payload.linkedClientId = 'client-record-id';
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}
