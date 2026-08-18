# Deployment Guide

This guide outlines the deployment process for the Trifusion-Dynamics backend services (Auth Service and AI Service).

## Prerequisites

- Node.js 20+ and pnpm (for Auth Service)
- Python 3.11+ (for AI Service)
- Docker & Docker Compose
- PostgreSQL and Redis instances
- Sentry DSNs for error tracking

## Environment Configuration

Ensure that `.env` files are configured for each service before deployment.

### Auth Service (`services/auth/.env`)
```env
PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://user:password@localhost:5432/agency_db"
REDIS_HOST=localhost
REDIS_PORT=6379
SENTRY_DSN="your-sentry-dsn"
```

### AI Service (`services/ai-service/.env`)
```env
ENVIRONMENT=production
OPENAI_API_KEY="your-openai-key"
SENTRY_DSN="your-sentry-dsn"
```

## Deployment Steps

### 1. Auth Service (NestJS)
1. Install dependencies: `pnpm install`
2. Build the application: `pnpm --filter auth build`
3. Run migrations: `pnpm --filter database prisma migrate deploy`
4. Start the service: `pnpm --filter auth start:prod`

Alternatively, build and run using Docker:
```bash
docker build -t auth-service ./services/auth
docker run -p 3000:3000 --env-file ./services/auth/.env auth-service
```

### 2. AI Service (FastAPI)
1. Navigate to the AI service: `cd services/ai-service`
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Or venv\Scripts\activate on Windows
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Start the server: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

Alternatively, build and run using Docker:
```bash
docker build -t ai-service ./services/ai-service
docker run -p 8000:8000 --env-file ./services/ai-service/.env ai-service
```

## Monitoring & Observability

- **Structured Logging:** The Auth service uses `nestjs-pino` to output structured JSON logs in production, and includes `X-Request-Id` headers for log correlation.
- **Error Tracking:** Unhandled exceptions in both services are automatically captured and sent to Sentry. Performance profiling is also enabled.

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration.
- **Backend CI:** Runs linting, tests, and builds for both Auth and AI services on PRs and merges to `main`.
- **API Integration Tests:** Runs E2E tests for the backend to ensure API contracts and integrations remain valid.
