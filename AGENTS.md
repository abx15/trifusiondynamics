# AGENTS.md

Kilo engineering guidelines for the AgencyOS repository.

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
- `POSTGRESQL_PRODUCTION_HARDENING_REPORT.md` — master production readiness report
- `DATABASE_SCHEMA_AUDIT.md` — model-by-model schema analysis
- `DATABASE_BACKUP_AND_RECOVERY.md` — backup strategy
- `RESTORE_PROCEDURE.md` — step-by-step restore runbooks
- `HIGH_RISK_QUERY_REPORT.md` — query risk assessment
