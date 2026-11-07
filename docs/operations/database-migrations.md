# Database Migration Safety

## Source of truth

- Prisma schema: `packages/database/prisma/schema.prisma`
- Migration history: `packages/database/prisma/migrations/`
- Workspace scripts: `packages/database/package.json`

## Local development

1. Change the Prisma schema.
2. Generate a migration against a disposable development database:

```bash
pnpm --filter @agency-os/database db:migrate:dev
pnpm --filter @agency-os/database db:generate
```

3. Review the generated SQL before committing.
4. Test upgrade behavior and affected application paths.
5. Add regression tests for changed data invariants.

## Deployment

Apply committed migrations with:

```bash
pnpm --filter @agency-os/database db:migrate:deploy
```

Do not use `db:push:unsafe` or `prisma db push` as a production migration strategy. Do not edit already-applied production migration files; create a new forward migration.

## Production safeguards

- Back up the database and confirm restore access.
- Test migrations on a recent staging copy.
- Consider lock duration, table size, index creation and compatibility with old application instances.
- Prefer expand-and-contract changes for zero/low-downtime deployments.
- Separate destructive cleanup from schema expansion.
- Record migration version and release SHA.
- Have an owner and rollback/forward-fix plan.

Prisma migration rollback is not automatically safe. Restoring a backup or applying a compensating migration may be required; choose based on the actual data and migration behavior.
