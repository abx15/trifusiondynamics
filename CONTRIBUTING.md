# Contributing to TriFusion Dynamics / AgencyOS

Thank you for considering a contribution. This guide explains how to report issues, propose changes, prepare a development environment and submit reviewable pull requests.

## Before you contribute

1. Read the root [README](README.md), [architecture guide](docs/architecture/README.md), [roadmap](docs/ROADMAP.md) and [security policy](SECURITY.md).
2. Search existing issues and pull requests to avoid duplicate work.
3. For substantial changes, open a discussion or issue first. Explain the problem, proposed approach, impact and alternatives.
4. Check the repository's licensing status. **There is currently no root open-source license.** Public visibility is not a grant of reuse rights. Ask the maintainers to clarify the applicable contribution and licensing terms before submitting substantial code.

## Ways to contribute

- Reproduce and report bugs with minimal steps.
- Add missing tests or regression coverage.
- Improve accessibility, usability, performance and documentation.
- Propose integrations, modules or service improvements.
- Review pull requests and help validate changes.

## Development setup

Follow the [Quick start](README.md#quick-start). Use the repository-pinned package manager:

```bash
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
```

Copy the environment templates and configure local-only credentials. Never use production credentials or customer data for local development.

## Branch and commit conventions

Use short, descriptive branches:

- `docs/<topic>`
- `fix/<issue-or-topic>`
- `feat/<topic>`
- `test/<topic>`
- `refactor/<topic>`

Recommended commit format:

```text
<type>(<scope>): <imperative summary>

Examples:
feat(crm): add lead source filters
fix(auth): reject expired refresh tokens
test(tenant): cover cross-organization access
docs(api): explain webhook retry behavior
refactor(billing): isolate invoice calculations
```

Keep commits focused. Avoid mixing formatting-only changes with behavior changes.

## Engineering expectations

### TypeScript and React

- Follow existing module, naming and formatting conventions.
- Prefer explicit types and validated DTOs at API boundaries.
- Keep business logic out of presentation components where practical.
- Handle loading, empty, error and success states.
- Preserve responsive behavior and keyboard accessibility.

### NestJS and API changes

- Keep controllers thin; put domain behavior in services.
- Validate and normalize untrusted input.
- Apply authentication, authorization and organization scoping to every protected data path.
- Do not trust `organizationId`, `userId`, role or permission values supplied by an untrusted client.
- Avoid leaking internal exception details, secrets or personal data in responses/logs.
- Document breaking API changes and update OpenAPI where applicable.

### Database and tenant isolation

- Update `packages/database/prisma/schema.prisma` and create a migration for schema changes.
- Never use `prisma db push` as a production migration mechanism.
- Use transactions for multi-step writes that must be atomic.
- Add indexes and bounded pagination for query patterns that need them.
- Scope reads, writes, updates and deletes to the authenticated organization.
- Add tests for cross-tenant access and missing tenant context.
- Do not enable PostgreSQL RLS without verifying that tenant context is set on the same transaction/connection as the protected query.

### AI service

- Keep provider keys server-side.
- Use timeouts and safe error handling for external calls.
- Avoid logging prompts or completions containing sensitive data.
- Add provider mocks for deterministic tests where possible.
- Document required provider credentials and optional fallback behavior.

### Security and privacy

- Never commit secrets, tokens, private keys, database dumps or real customer information.
- Do not add telemetry that collects sensitive user content without clear necessity and disclosure.
- Treat uploaded files, webhook payloads and model output as untrusted input.
- See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Validation

Run the checks relevant to the files you changed:

```bash
pnpm lint
pnpm build
pnpm --filter auth test
pnpm run test:api
```

For Prisma changes:

```bash
pnpm --filter @agency-os/database db:generate
pnpm --filter @agency-os/database db:migrate:deploy
```

Do not claim checks passed if they were not run. Include any unavailable dependencies or skipped checks in the pull request description.

## Pull request checklist

- [ ] The PR has a clear title and explains the problem being solved.
- [ ] Related issue/discussion is linked.
- [ ] Scope is focused; unrelated changes are excluded.
- [ ] Tests cover new behavior and regression cases.
- [ ] Tenant isolation and authorization implications were reviewed.
- [ ] Database changes include a migration and rollback/operational notes where relevant.
- [ ] Environment variable and deployment changes are documented.
- [ ] README/API/docs are updated where needed.
- [ ] No secrets, credentials, generated artifacts or customer data are included.
- [ ] Lint, build and relevant tests were run and results are stated.
- [ ] UI changes include screenshots or a short recording when useful.

## Review and merge

Maintainers may request changes, additional tests or a narrower scope. A pull request is not accepted until required checks and reviews pass. Do not merge your own change unless repository permissions and maintainer policy explicitly allow it.

## Suggesting a new service or integration

Open a feature proposal with:

1. User problem and target audience.
2. Proposed workflow and expected outcomes.
3. Whether it belongs in AgencyOS core, an optional integration or a TriFusion Dynamics client service.
4. Data model, permissions, tenant-isolation and privacy implications.
5. External dependencies, cost, operational ownership and failure modes.
6. MVP scope, acceptance criteria and test strategy.

A roadmap entry is not a delivery commitment. Prioritization is decided by maintainers.

## Community standards

Be respectful, constructive and inclusive. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
