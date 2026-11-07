# Admin Dashboard

The AgencyOS operations dashboard is the Next.js application under `apps/admin-dashboard`. It provides role-oriented workspaces for organization administration, super-admin operations, agents, employees, HR and client-facing workflows.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- TanStack Query, Zustand and Axios
- Shared types and UI/database workspace packages where applicable

## Local development

From the repository root:

```bash
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
cp .env.example .env
pnpm --filter admin-dashboard dev
```

Open http://localhost:3001.

The dashboard requires a running/configured API for authenticated and data-backed features. Set the API URL using the environment variable consumed by the current API client/build configuration. Never place server secrets in `NEXT_PUBLIC_*` variables.

## Build and lint

```bash
pnpm --filter admin-dashboard lint
pnpm --filter admin-dashboard build
```

## Application areas

The App Router contains role-specific route groups for admin, super-admin, agent, employee and client experiences, plus HR pages and shared authentication/layout components. Route presence does not imply that every workflow is complete or that a user is authorized; verify backend guards and permissions.

## Engineering notes

- Use the shared API client and query hooks rather than embedding fetch logic inconsistently in pages.
- Handle loading, empty, error and success states.
- Enforce authorization on the server/API; hiding a navigation item is not access control.
- Preserve organization scoping and avoid trusting tenant identifiers supplied by the browser.
- Add tests for new role behavior and cross-tenant denial.
- Keep pages responsive and keyboard accessible.

See the root [README](../../README.md), [contribution guide](../../CONTRIBUTING.md), [architecture guide](../../docs/architecture/README.md) and [testing guide](../../docs/development/testing.md).
