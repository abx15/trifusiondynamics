export type UserRoleType = 'admin' | 'employee' | 'client';

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  roles: string[];
  permissions: string[];
  /** Populated for users with the `client` role. */
  linkedClientId?: string | null;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  mustChangePassword: boolean;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  } | null;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}
