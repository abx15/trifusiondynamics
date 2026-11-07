# Agency Website

The public TriFusion Dynamics website is the Next.js application under `apps/agency-web`. It presents the organization, engineering services, portfolio, blog and contact/lead-capture experience.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Static/CMS-shaped content helpers and API integration

## Local development

From the repository root:

```bash
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
pnpm --filter agency-web dev
```

Open http://localhost:3000.

The public website can render content using its configured content/API integration and local fallback data. Configure the API base URL expected by `apps/agency-web/lib/api.ts` when working on API-backed content. Do not add private credentials to browser-visible variables.

## Build and lint

```bash
pnpm --filter agency-web lint
pnpm --filter agency-web build
```

## Main sections

- Home and organization information
- Services catalogue and service detail pages
- Portfolio listing and project detail pages
- Blog listing and article pages
- Contact form
- Privacy, cookie, refund and terms pages
- Sitemap, robots and metadata helpers

Service and portfolio content is currently represented through the website's CMS/static-data integration. Before adding a new public service, update the relevant content source and verify slug, metadata, icon mapping and page rendering.

## Contribution notes

- Keep SEO metadata and structured data accurate.
- Do not publish invented testimonials, client logos, metrics or delivery guarantees.
- Validate contact form behavior and spam/error handling.
- Maintain responsive layouts, accessible navigation and reduced-motion support.
- Keep legal copy reviewed by the organization before treating it as legal advice.

See the root [README](../../README.md), [contribution guide](../../CONTRIBUTING.md) and [service catalogue](https://trifusiondynamics.vercel.app/services).
