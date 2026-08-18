export type UserRoleType = 'admin' | 'employee' | 'client';

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  roles: string[];
  permissions: string[];
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  mustChangePassword: boolean;
  organizationId: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}
