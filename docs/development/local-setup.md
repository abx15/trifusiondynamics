# Local Development Setup

## Requirements

- Git
- Node.js 20+ (supported LTS)
- pnpm 10.26.1
- Python 3.11+ for the AI service
- Docker Compose, or managed PostgreSQL and Redis services

## Install

```bash
git clone https://github.com/abx15/trifusiondynamics.git
cd trifusiondynamics
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
```

## Environment

```bash
cp .env.example .env
cp services/ai-service/.env.example services/ai-service/.env
```

Configure database, Redis, JWT and CORS values. Generate separate strong JWT secrets. Do not reuse production credentials.

## Infrastructure

To run the local PostgreSQL and Redis services from the development Compose file:

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
```

Review the Compose file before exposing ports on a shared or public machine. Its defaults are for local development only.

## Prisma

```bash
pnpm --filter @agency-os/database db:generate
pnpm --filter @agency-os/database db:migrate:deploy
```

Use `db:migrate:dev` for schema development against a disposable local database. Never use `db:push:unsafe` in production.

## Start services

Open separate terminals:

```bash
pnpm --filter auth dev
pnpm --filter agency-web dev
pnpm --filter admin-dashboard dev
```

For the AI service:

```bash
cd services/ai-service
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Local URLs

- Website: http://localhost:3000
- Dashboard: http://localhost:3001
- API: http://localhost:8000/api
- API health: http://localhost:8000/api/health
- API docs: http://localhost:8000/api/docs
- AI health: http://localhost:8001/health

If startup fails, check environment validation, database reachability, Redis connectivity, generated Prisma Client and package-specific logs before changing code.
