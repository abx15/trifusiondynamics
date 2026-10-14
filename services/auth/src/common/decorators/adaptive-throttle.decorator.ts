import { SetMetadata } from '@nestjs/common';

export interface AdaptiveThrottleOptions {
  /** Base limit for the endpoint */
  limit: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Optional burst multiplier for high-priority users */
  burst?: number;
  /** Role-based multipliers (e.g., { admin: 3, user: 1, super_admin: 10 }) */
  roleMultipliers?: Record<string, number>;
  /** Endpoint category for default limits (used if no explicit limit) */
  category?: 'auth' | 'read' | 'write' | 'admin';
}

export const ADAPTIVE_THROTTLE_KEY = 'adaptive_throttle';

export const AdaptiveThrottle = (options: AdaptiveThrottleOptions) =>
  SetMetadata(ADAPTIVE_THROTTLE_KEY, options);
