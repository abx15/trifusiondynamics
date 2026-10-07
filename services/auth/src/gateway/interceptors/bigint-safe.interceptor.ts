import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * Converts BigInt values to Numbers so Express's
 * `res.json` never fails with "Do not know how to
 * serialize a BigInt".
 *
 * SLA bookkeeping (`totalPausedDurationMs`) is modeled
 * as BigInt in Prisma; every other response field is
 * JSON-native. Durations in milliseconds are far below
 * Number.MAX_SAFE_INTEGER, so the conversion is
 * lossless in practice.
 */
function toJsonSafe<T>(value: T): T {
  if (typeof value === 'bigint') {
    return Number(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item)) as unknown as T;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    target[key] = toJsonSafe(source[key]);
  }
  return target as T;
}

@Injectable()
export class BigIntSafeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((body) => toJsonSafe(body)));
  }
}
