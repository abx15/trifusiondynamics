import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '@agency-os/types';

/**
 * Custom ThrottlerGuard that resolves the rate-limit tracker as follows:
 *
 * 1. If the request carries a valid Bearer token (or access_token cookie),
 *    the tracker is the JWT subject (`sub`) — making rate limits per-USER
 *    rather than per-IP. This prevents users behind a shared NAT/corporate
 *    proxy from sharing a rate-limit bucket.
 *
 * 2. Otherwise (public endpoints, login, register), the tracker falls
 *    back to the client IP address — same behaviour as the stock guard.
 *
 * The tracker value is hashed by the parent class's `generateKey` to form
 * the Redis key, so raw user IDs never appear in Redis keys directly.
 *
 * This guard is registered as the global APP_GUARD, replacing the stock
 * ThrottlerGuard. The Redis-backed storage (RedisThrottlerStorage) is reused
 * unchanged — distributed across all API instances with in-memory fallback.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    // Try Bearer token
    const authHeader = req.headers?.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const secret = process.env.JWT_ACCESS_SECRET;
        if (secret) {
          const decoded = jwt.verify(token, secret) as JwtPayload;
          if (decoded && decoded.sub) {
            return `user:${decoded.sub}`;
          }
        }
      } catch {
        // Token invalid/expired — fall back to IP
      }
    }

    // Try access_token cookie (less efficient but supported)
    if (req.cookies?.access_token) {
      try {
        const secret = process.env.JWT_ACCESS_SECRET;
        if (secret) {
          const decoded = jwt.verify(req.cookies.access_token, secret) as JwtPayload;
          if (decoded && decoded.sub) {
            return `user:${decoded.sub}`;
          }
        }
      } catch {
        // Invalid cookie — fall back to IP
      }
    }

    // Fall back to IP for unauthenticated requests
    return super.getTracker(req);
  }
}
