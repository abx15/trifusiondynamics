# AGENTS.md

engineering guidelines for the AgencyOS repository.

## Project Layout

```
agency-os/
├── apps/                    # Frontend applications
│   ├── agenxy-web/          # Main frontend
│   ├── admin-dashboard/
│   └── client-portal/
├── packages/
│   ├── database/            # Prisma schema, migrations, seed scripts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   └── types/               # Shared TypeScript types
├── services/
│   └── auth/                # NestJS auth service
│       └── src/
├── scripts/
│   ├── migrate.sh           # Safe migration helper
└── docs/                    # Technical documentation
```

## Verification Commands

Run these before completing any database-related change:

### Lint
```bash
pnpm lint                      # Root-level lint across all packages
pnpm --filter auth-service lint  # Auth service only
```

### Type Check
```bash
pnpm --filter auth-service build    # Build also performs type checking
```

### Tests
```bash
pnpm --filter auth-service test    # Run auth service test suite
```

### Migration Safety
```bash
# Review what a migration would change (never run db push in production)
pnpm --filter database exec -- prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma

# Validate migrations compile
pnpm --filter database exec -- prisma generate --check
```

## Database Guidelines

1. **Never use `prisma db push` in production** — always use `prisma migrate deploy`
2. **Always wrap multi-step writes in `$transaction`** — especially auth flows (token rotation)
3. **Always bound `findMany` calls** — add `take:` or use `parsePagination()` from `common/utils/pagination.ts`
4. **Never hardcode database URLs** — use `process.env.DIRECT_URL || process.env.DATABASE_URL`
5. **Always add production guards** to destructive scripts (`NODE_ENV === 'production'` checks)
6. **Use tagged template literals** for raw SQL: `` prisma.$queryRaw`SELECT ...` `` — never `$queryRawUnsafe` with user input
7. **Apply session-level GUCs** in `onModuleInit()` — `statement_timeout`, `idle_in_transaction_session_timeout`

## Documentation

Relevant docs live in `docs/` — update them when making schema or infrastructure changes:
- `POSTGRESQL_PRODUCTION_HARDENING_REPORT.md` — PostgreSQL production readiness report
- `DATABASE_SCHEMA_AUDIT.md` — model-by-model schema analysis
- `DATABASE_BACKUP_AND_RECOVERY.md` — backup strategy
- `RESTORE_PROCEDURE.md` — step-by-step restore runbooks
- `HIGH_RISK_QUERY_REPORT.md` — query risk assessment
- `REDIS_ARCHITECTURE.md` — Redis architecture audit
- `REDIS_OPERATIONS.md` — Redis operations guide
- `REDIS_PRODUCTION_HARDENING_REPORT.md` — Redis production hardening report
- `CLOUDFLARE_PRODUCTION_SETUP.md` — Cloudflare edge security setup instructions
- `CLOUDFLARE_EDGE_SECURITY_REPORT.md` — Cloudflare edge security report

## Production Deployment Checklist

Before deploying to production, complete these security checks:

### 1. Environment Variables (CRITICAL)
- [ ] Copy `.env.production` to `.env` and fill in real values
- [ ] Replace all placeholder values (marked with "replace-with-...")
- [ ] Generate strong JWT secrets: `openssl rand -base64 64`
- [ ] Generate AI_SERVICE_SECRET: `openssl rand -hex 32`
- [ ] Set strong admin passwords (16+ chars, mixed case, numbers, symbols)
- [ ] Add real AI API keys (Anthropic, OpenAI, Gemini)
- [ ] Set `NODE_ENV=production`
- [ ] Remove localhost URLs from CORS_ALLOWED_ORIGINS
- [ ] Update DATABASE_URL, REDIS_URL with production credentials
- [ ] Set SENTRY_DSN for error tracking (optional but recommended)

### 2. AI Service Configuration
- [ ] Copy `services/ai-service/.env.production` to `services/ai-service/.env`
- [ ] Fill in AI API keys
- [ ] Set AI_SERVICE_SECRET (same as in root .env)
- [ ] Update CORS_ALLOWED_ORIGINS for production domains
- [ ] Set ENVIRONMENT=production

### 3. Security Best Practices
- [ ] Never commit `.env` files to version control
- [ ] Use environment variable managers in production (Vercel env vars, Render env vars, etc.)
- [ ] Rotate secrets regularly (quarterly)
- [ ] Enable 2FA on all service accounts
- [ ] Set up automated backups
- [ ] Configure rate limiting
- [ ] Enable HTTPS everywhere
- [ ] Set up logging and monitoring

### 4. Database Security
- [ ] Never use `prisma db push` in production - use `prisma migrate deploy`
- [ ] Ensure connection pooling is configured
- [ ] Set appropriate connection limits
- [ ] Enable SSL/TLS for all database connections
- [ ] Use read replicas for high-traffic scenarios
