import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Production-safe timeouts applied to every database connection.
 *
 * - connect_timeout (10s): prevents the app from hanging indefinitely if the
 *   Neon pooler / network is unreachable.
 * - statement_timeout (60s): aborts any single query that runs longer, so a
 *   runaway query cannot hold a connection forever.  This is generous enough
 *   for analytical reads yet short enough to surface stuck queries.
 * - idle_in_transaction_session_timeout (60s): automatically cancels sessions
 *   that sit idle inside a transaction (e.g. a connection dropped mid-request),
 *   preventing connection-pool exhaustion.
 */
const CONNECT_TIMEOUT = 10;
const STATEMENT_TIMEOUT_MS = 60_000;
const IDLE_IN_TXN_TIMEOUT_MS = 60_000;

function withTimeoutParams(url: string): string {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  const appName = encodeURIComponent(`trifusion-auth-${process.pid}`);
  return `${url}${separator}connect_timeout=${CONNECT_TIMEOUT}&application_name=${appName}`;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: withTimeoutParams(process.env.DATABASE_URL || ''),
        },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');

      // Apply session-level GUCs (timeouts) on the shared connection pool.
      // Neon honours these per-session; they protect against runaway queries
      // and stuck transactions that would otherwise exhaust the pool.
      await this.$executeRawUnsafe`
        SET statement_timeout = ${STATEMENT_TIMEOUT_MS};
      `;
      await this.$executeRawUnsafe`
        SET idle_in_transaction_session_timeout = ${IDLE_IN_TXN_TIMEOUT_MS};
      `;
      this.logger.log(
        `Timeouts configured: statement_timeout=${STATEMENT_TIMEOUT_MS}ms, idle_in_transaction_session_timeout=${IDLE_IN_TXN_TIMEOUT_MS}ms`,
      );
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
