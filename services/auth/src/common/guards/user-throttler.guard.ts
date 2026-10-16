import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
} from '@nestjs/throttler';
import type {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '@agency-os/types';
import {
  ADAPTIVE_THROTTLE_KEY,
  AdaptiveThrottleOptions,
} from '../decorators/adaptive-throttle.decorator';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
  THROTTLER_BLOCK_DURATION,
  THROTTLER_TRACKER,
  THROTTLER_KEY_GENERATOR,
  THROTTLER_SKIP,
} from '@nestjs/throttler/dist/throttler.constants';

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
 * 3. Supports @AdaptiveThrottle decorator for role-based adaptive limits:
 *    - Base limit + TTL per endpoint
 *    - Role multipliers (admin=3x, super_admin=10x, etc.)
 *    - Burst capacity for high-priority operations
 *
 * The tracker value is hashed by the parent class's `generateKey` to form
 * the Redis key, so raw user IDs never appear in Redis keys directly.
 *
 * This guard is registered as the global APP_GUARD, replacing the stock
 * ThrottlerGuard. The Redis-backed storage (RedisThrottlerStorage) is reused
 * unchanged — distributed across all API instances with in-memory fallback.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard implements CanActivate {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected override async getTracker(
    req: Record<string, any>,
  ): Promise<string> {
    // Try Bearer token
    const authHeader = req.headers?.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
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
          const decoded = jwt.verify(
            req.cookies.access_token,
            secret,
          ) as JwtPayload;
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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Check for @AdaptiveThrottle on method first, then class
    const adaptiveOptions =
      this.reflector.get<AdaptiveThrottleOptions>(
        ADAPTIVE_THROTTLE_KEY,
        handler,
      ) ??
      this.reflector.get<AdaptiveThrottleOptions>(
        ADAPTIVE_THROTTLE_KEY,
        classRef,
      );

    // If no adaptive throttle, fall back to default behavior
    if (!adaptiveOptions) {
      return super.canActivate(context);
    }

    // Check if throttling should be skipped
    if (await this.shouldSkip(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    // Calculate effective limit based on role multiplier
    let effectiveLimit = adaptiveOptions.limit;

    if (user && user.roles && adaptiveOptions.roleMultipliers) {
      const userRoles = user.roles;
      let maxMultiplier = 1;

      for (const role of userRoles) {
        const multiplier = adaptiveOptions.roleMultipliers[role];
        if (multiplier && multiplier > maxMultiplier) {
          maxMultiplier = multiplier;
        }
      }

      effectiveLimit = Math.floor(adaptiveOptions.limit * maxMultiplier);
    }

    // Apply burst if available and user has high-priority role
    if (user && user.roles && adaptiveOptions.burst) {
      const userRoles = user.roles;
      const highPriorityRoles = ['admin', 'super_admin', 'manager'];
      const hasHighPriority = userRoles.some((r) =>
        highPriorityRoles.includes(r),
      );

      if (hasHighPriority) {
        effectiveLimit = Math.floor(effectiveLimit * adaptiveOptions.burst);
      }
    }

    // Get the skipIf function if defined
    const skipIf = this.reflector.getAllAndOverride(
      THROTTLER_SKIP + 'default',
      [handler, classRef],
    );

    if (skipIf?.(context)) {
      return true;
    }

    // Use the adaptive limit and TTL
    const limit = effectiveLimit;
    const ttl = adaptiveOptions.ttl;
    const blockDuration = adaptiveOptions.ttl; // Default to TTL

    // Get custom tracker if defined
    const routeOrClassGetTracker = this.reflector.getAllAndOverride(
      THROTTLER_TRACKER + 'default',
      [handler, classRef],
    );
    const getTracker =
      routeOrClassGetTracker ||
      this.commonOptions?.getTracker ||
      this.getTracker.bind(this);

    // Get custom key generator if defined
    const routeOrClassGetKeyGenerator = this.reflector.getAllAndOverride(
      THROTTLER_KEY_GENERATOR + 'default',
      [handler, classRef],
    );
    const generateKey =
      routeOrClassGetKeyGenerator ||
      this.commonOptions?.generateKey ||
      this.generateKey.bind(this);

    // Handle the request with adaptive limits
    return this.handleRequest({
      context,
      limit,
      ttl,
      throttler: { name: 'default', limit, ttl, blockDuration },
      blockDuration,
      getTracker,
      generateKey,
    });
  }
}
