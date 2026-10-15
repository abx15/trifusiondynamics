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

function withPgBouncerParams(url: string): string {
  if (!url) return url;
  // PgBouncer requires prepared statements disabled and specific pool mode
  // For transaction pool mode (recommended), we need:
  // - pgbouncer=true (or equivalent via pool_mode=transaction)
  // - Disable prepared statements in Prisma
  if (url.includes('pgbouncer') || url.includes('pool_mode')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}pgbouncer=true&connection_limit=1`;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly replicaUrls: Record<string, string> = {};

  constructor(
    @Inject(RequestContextService)
    private readonly requestContext: RequestContextService,
  ) {
    // Build datasources with support for read replicas
    const datasources: Record<string, { url: string }> = {
      db: {
        url: withTimeoutParams(
          process.env.DATABASE_URL ||
            process.env.DIRECT_URL ||
            process.env.DATABASE_WRITE_URL ||
            '',
        ),
      },
    };

    // Add read replicas if configured
    if (process.env.DATABASE_READ_REPLICA_URLS) {
      const replicaUrls = process.env.DATABASE_READ_REPLICA_URLS.split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      replicaUrls.forEach((url, index) => {
        const key = `read_replica_${index + 1}`;
        datasources[key] = { url: withTimeoutParams(url) };
        this.replicaUrls[key] = withTimeoutParams(url);
      });
    }

    // Check if we should use PgBouncer for the primary connection
    const usePgBouncer = process.env.DATABASE_USE_PGBOUNCER === 'true';

    super({
      datasources,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
      // Disable prepared statements when using PgBouncer in transaction pool mode
      ...(usePgBouncer
        ? { __internal: { engine: { disablePreparedStatements: true } } }
        : {}),
    });

    this.$use((params, next) => this.rlsMiddleware(params, next));
  }

  /**
   * Get a Prisma client instance connected to a read replica.
   * Use this for read-heavy analytics/reporting queries.
   * Falls back to primary if no replicas configured.
   */
  getReadReplica(): PrismaClient {
    const replicaKeys = Object.keys(this.replicaUrls);

    if (replicaKeys.length === 0) {
      this.logger.debug('No read replicas configured, using primary');
      return this;
    }

    // Round-robin selection (simple load balancing)
    const replicaIndex = Math.floor(Math.random() * replicaKeys.length);
    const replicaKey = replicaKeys[replicaIndex];
    const replicaUrl = this.replicaUrls[replicaKey];

    if (!replicaUrl) {
      return this;
    }

    // Create a new client instance pointing to the replica
    return new PrismaClient({
      datasources: { db: { url: replicaUrl } },
      log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    });
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

      // Log read replica configuration
      const replicaCount = Object.keys(this.replicaUrls).length;
      if (replicaCount > 0) {
        this.logger.log(`📖 ${replicaCount} read replica(s) configured`);
      }

      if (process.env.DATABASE_USE_PGBOUNCER === 'true') {
        this.logger.log(
          '🔗 PgBouncer mode enabled (prepared statements disabled)',
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
