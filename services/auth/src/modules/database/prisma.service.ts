import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/context/request-context.service';

/**
 * Production-safe timeouts applied to every database connection.
 *
 * - connect_timeout (30s): prevents the app from hanging indefinitely if the
 *   Neon pooler / network is unreachable.
 * - statement_timeout (60s): aborts any single query that runs longer, so a
 *   runaway query cannot hold a connection forever.  This is generous enough
 *   for analytical reads yet short enough to surface stuck queries.
 * - idle_in_transaction_session_timeout (60s): automatically cancels sessions
 *   that sit idle inside a transaction (e.g. a connection dropped mid-request),
 *   preventing connection-pool exhaustion.
 */
const CONNECT_TIMEOUT = 30;
const STATEMENT_TIMEOUT_MS = 60_000;
const IDLE_IN_TXN_TIMEOUT_MS = 60_000;

function withTimeoutParams(url: string): string {
  if (!url) return url;
  // Don't add connect_timeout if URL already has it (from .env)
  if (url.includes('connect_timeout')) return url;
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

  constructor(
    @Inject(RequestContextService)
    private readonly requestContext: RequestContextService,
  ) {
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

    this.$use(this.rlsMiddleware);
  }

  private async rlsMiddleware(
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<any>,
  ) {
    // Skip RLS for internal Prisma raw operations
    const rawActions = ['executeRaw', 'queryRaw', 'runCommandRaw'];
    if (rawActions.includes(params.action)) {
      return next(params);
    }

    const orgId = this.requestContext.getOrgId();
    const bypassRls = this.requestContext.get<string>('bypassRls');

    if (orgId) {
      await this.$executeRawUnsafe(
        `SET LOCAL app.current_org_id = ${this.escapeLiteral(orgId)};`,
      );
    } else if (bypassRls === 'on') {
      await this.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'on';`);
    }

    try {
      return await next(params);
    } finally {
      if (orgId) {
        await this.$executeRawUnsafe(`RESET app.current_org_id;`);
      } else if (bypassRls === 'on') {
        await this.$executeRawUnsafe(`RESET app.bypass_rls;`);
      }
    }
  }

  private escapeLiteral(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');

      // Apply session-level GUCs (timeouts) — best-effort, non-fatal
      try {
        await this.$executeRawUnsafe(
          `SET statement_timeout = ${STATEMENT_TIMEOUT_MS};`,
        );
        await this.$executeRawUnsafe(
          `SET idle_in_transaction_session_timeout = ${IDLE_IN_TXN_TIMEOUT_MS};`,
        );
        this.logger.log(
          `Timeouts configured: statement_timeout=${STATEMENT_TIMEOUT_MS}ms, idle_in_transaction_session_timeout=${IDLE_IN_TXN_TIMEOUT_MS}ms`,
        );
      } catch (gucsError) {
        this.logger.warn(
          'Could not set session GUCs (non-fatal, continuing):',
          gucsError,
        );
      }
    } catch (error) {
      // Log the error but do NOT throw — we want the service to start even if
      // the DB is temporarily unavailable (e.g. Neon cold start, quota limit).
      // Individual requests will fail gracefully if the DB is unreachable.
      this.logger.error(
        '⚠️  Database connection failed on startup — service will still start. Individual requests may fail until DB is reachable:',
        (error as Error)?.message,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
