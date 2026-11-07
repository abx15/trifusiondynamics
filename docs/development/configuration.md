# Environment Configuration

## Templates

- Root application: [`.env.example`](../../.env.example)
- AI service: [`services/ai-service/.env.example`](../../services/ai-service/.env.example)

Copy templates into local ignored `.env` files. Templates are starting points; inspect service configuration code to confirm which variables are required for the exact feature and environment.

## Common variables

| Variable | Used for | Notes |
|---|---|---|
| `NODE_ENV` | NestJS runtime mode | Use `production` only in production |
| `DATABASE_URL` | PostgreSQL runtime access | Use a least-privilege application account |
| `DIRECT_URL` | Direct DB connection | Typically used by Prisma migration operations |
| `REDIS_URL` | Redis connection | Keep credentials private; use TLS where supported |
| `JWT_ACCESS_SECRET` | Access-token signing | API startup requires at least 32 characters |
| `JWT_REFRESH_SECRET` | Refresh-token signing | Use a different secret from access-token secret |
| `CORS_ALLOWED_ORIGINS` | Browser origin allowlist | Comma-separated exact origins, no wildcard for credentialed auth |
| `AI_SERVICE_URL` | NestJS to FastAPI base URL | Use private service networking in production where available |
| `AI_SERVICE_SECRET` | Internal service authentication | Must match the AI service's expected secret |
| `OPENAI_API_KEY` | OpenAI provider | Optional unless a selected workflow requires it |
| `ANTHROPIC_API_KEY` | Anthropic provider | Optional unless a selected workflow requires it |
| `GEMINI_API_KEY` | Google Gemini provider | Optional unless a selected workflow requires it |
| `SENTRY_DSN` | Error reporting | Optional |

## Generate secrets

Use a cryptographically secure generator and create distinct values:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Do not use example strings or passwords from old documentation. Rotate any credential that has ever been committed or shared.

## Secret handling

- Keep `.env` files out of Git.
- Use Vercel/Render or your deployment provider's encrypted environment settings.
- Restrict access to production secrets.
- Rotate keys when a contributor leaves or exposure is suspected.
- Never include secrets in screenshots, bug reports, test fixtures or CI logs.
- Use separate credentials for local, staging and production environments.

## CORS and public frontend variables

Only variables intentionally prefixed with `NEXT_PUBLIC_` should contain browser-visible values. Never put private keys, database credentials, JWT secrets or internal service secrets in a public frontend variable.

CORS values must match the exact deployed frontend origins. Update backend and AI service allowlists independently when their settings differ.
