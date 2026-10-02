import { createHash } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { RedisService } from '../database/redis.service';

const FALLBACK_BLOCKLIST = new Map<string, number>();
const DEFAULT_TTL_SECONDS = 60 * 60;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function pruneFallbackBlocklist(now = Date.now()) {
  for (const [hash, expiresAt] of FALLBACK_BLOCKLIST.entries()) {
    if (expiresAt <= now) {
      FALLBACK_BLOCKLIST.delete(hash);
    }
  }
}

export function getAccessTokenTtlSeconds(token: string): number {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    return DEFAULT_TTL_SECONDS;
  }

  return Math.max(1, decoded.exp - Math.floor(Date.now() / 1000));
}

export async function blockAccessToken(
  token: string,
  redis?: RedisService,
): Promise<void> {
  const ttlSeconds = getAccessTokenTtlSeconds(token);
  const tokenHash = hashToken(token);
  const key = `session:access-denylist:${tokenHash}`;

  const storedInRedis = redis ? await redis.set(key, '1', ttlSeconds) : false;

  if (!storedInRedis) {
    pruneFallbackBlocklist();
    FALLBACK_BLOCKLIST.set(tokenHash, Date.now() + ttlSeconds * 1000);
  }
}

export async function isAccessTokenBlocked(
  token: string,
  redis?: RedisService,
): Promise<boolean> {
  const tokenHash = hashToken(token);
  const key = `session:access-denylist:${tokenHash}`;

  if (redis && (await redis.get(key))) {
    return true;
  }

  pruneFallbackBlocklist();
  const fallbackExpiry = FALLBACK_BLOCKLIST.get(tokenHash);
  return !!fallbackExpiry && fallbackExpiry > Date.now();
}
