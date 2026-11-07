# Testing and Quality Checks

## Workspace checks

From repository root:

```bash
pnpm lint
pnpm build
```

These commands use Turborepo and package scripts. A command can fail if a package has no matching script or its prerequisites are unavailable; inspect the failing task rather than skipping it silently.

## Backend unit tests

```bash
pnpm --filter auth test
```

For coverage:

```bash
pnpm --filter auth test:cov
```

## API integration collection

```bash
pnpm run test:api
```

This runs Newman against `postman/trifusion-dynamics.postman_collection.json` using `postman/local.postman_environment.json`. Review the environment file and ensure the target is a disposable local/staging system before running mutating requests.

## Browser / end-to-end tests

The repository includes Playwright configuration and tests under `e2e/`. Inspect `playwright.config.ts` for required base URLs, browser installation and service startup before running the suite.

## Database validation

```bash
pnpm --filter @agency-os/database db:generate
pnpm --filter @agency-os/database db:migrate:deploy
```

Use a disposable local database for migration tests. Back up persistent environments before schema changes.

## AI service

The FastAPI service depends on Python packages and may call external LLM providers. Use mocked provider clients for deterministic tests and never point tests at production data.

## Reporting results

A good pull request states:
- Exact commands executed.
- Passed and failed checks.
- Checks not run and why.
- External services/credentials required.
- Any migration or manual verification still outstanding.

Do not report a skipped test as a pass.
