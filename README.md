# AgencyOS (Trifusion Dynamics)

AgencyOS is an all-in-one agency management platform that brings together CRM, project management, HR, billing, AI, and developer tools in a single unified system. It is designed for digital agencies that want one coherent backend and multiple frontend experiences — admin, client portal, and public web — without juggling disconnected tools.

## 🚀 System Architecture Flow

```mermaid
graph TB
    subgraph "Frontend Applications"
        A[Agency Web<br/>Next.js<br/>Port 3000]
        B[Admin Dashboard<br/>Next.js<br/>Port 3001]
        C[Client Portal<br/>Next.js<br/>Port 3002]
    end

    subgraph "Backend Services"
        D[Auth Service<br/>NestJS<br/>Port 8000]
        E[AI Service<br/>FastAPI<br/>Port 8001]
    end

    subgraph "Data Layer"
        F[(PostgreSQL<br/>Primary DB)]
        H[(Redis<br/>Cache)]
    end

    subgraph "External Services"
        I[OpenAI/Anthropic]
        J[Sentry<br/>Error Tracking]
    end

    subgraph "Shared Packages"
        K[Database Package<br/>Prisma]
        L[UI Components]
        M[TypeScript Types]
    end

    %% Connections
    A -->|HTTP/HTTPS| D
    B -->|HTTP/HTTPS| D
    C -->|HTTP/HTTPS| D

    D -->|AI Requests| E
    D -->|Prisma ORM| F
    D -->|Cache Manager| H
    D -->|Telemetry| J

    E -->|API Calls| I
    E -->|Telemetry| J

    D -->|Shared| K
    A -->|Shared| L
    B -->|Shared| L
    D -->|Shared| M
    A -->|Shared| M
    B -->|Shared| M

    style A fill:#4CAF50,color:#fff
    style B fill:#2196F3,color:#fff
    style C fill:#FF9800,color:#fff
    style D fill:#9C27B0,color:#fff
    style E fill:#E91E63,color:#fff
    style F fill:#607D8B,color:#fff
    style H fill:#F44336,color:#fff
```

## 📁 Project Structure

```
agency-os/
├── apps/                    # Frontend applications
│   ├── agency-web/          # Main frontend
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
├── scripts/                 # Utility scripts
├── docs/                    # Technical documentation
│   ├── architecture/        # System architecture docs
│   ├── deployment/         # Deployment guides
│   └── *.md                # Various technical reports
└── README.md
```

## 🔗 Documentation

### System Architecture
- **[Complete System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)** - Detailed architecture with service diagrams, data flows, and module interconnections
- **[Authentication Flow](docs/architecture/auth-flow.md)** - Detailed authentication flow documentation
- **[Ecosystem Overview](docs/architecture/ecosystem.md)** - Project ecosystem and dependencies

### Database & Infrastructure
- **[Database Schema Audit](docs/DATABASE_SCHEMA_AUDIT.md)** - Model-by-model schema analysis
- **[PostgreSQL Production Hardening](docs/POSTGRESQL_PRODUCTION_HARDENING_REPORT.md)** - PostgreSQL production readiness report
- **[Redis Architecture](docs/REDIS_ARCHITECTURE.md)** - Redis architecture audit
- **[Redis Production Hardening](docs/REDIS_PRODUCTION_HARDENING_REPORT.md)** - Redis production hardening report

### Security & Operations
- **[Database Backup & Recovery](docs/DATABASE_BACKUP_AND_RECOVERY.md)** - Backup strategy and procedures
- **[Restore Procedure](docs/RESTORE_PROCEDURE.md)** - Step-by-step restore runbooks
- **[Cloudflare Production Setup](docs/CLOUDFLARE_PRODUCTION_SETUP.md)** - Cloudflare edge security setup
- **[Cloudflare Edge Security Report](docs/CLOUDFLARE_EDGE_SECURITY_REPORT.md)** - Cloudflare edge security report

### Development Guidelines
- **[AGENTS.md](AGENTS.md)** - Engineering guidelines and verification commands
- **[Seeded Users Credentials](docs/SEEDED_USERS_CREDENTIALS.md)** - Test user credentials and login information

## 🛠️ What It Does

AgencyOS handles the full agency lifecycle:

- **Authentication & Access** — Secure login with JWT HttpOnly cookies, role-based access control, and user management.
- **Client Management** — Track leads, manage contacts, map organizations, and move deals through a visual sales pipeline.
- **Projects & Tasks** — Create projects, assign sprints and tasks, set milestones, and keep teams aligned with Kanban-ready workflows.
- **HR & Payroll** — Manage employees, attendance punches, leave requests, recruitment pipelines, salary structures, and payslip generation.
- **Billing & Finance** — Generate estimates and invoices, manage subscriptions, record expenses, and track payment status.
- **Helpdesk & Drive** — Support tickets with real-time chat messaging, FAQ management, and a secure internal document drive with folders and files.
- **AI Assistant** — Built-in AI tools for proposal generation, SEO audits, email writing, meeting summarization, and conversational chat assistance.
- **Analytics** — Revenue dashboards, client metrics, team performance, and automated rollup aggregations.
- **Automation** — Event-driven workflow engine with triggers, conditions, and actions that react to lifecycle events like `lead.created` or `invoice.paid`.
- **Developer Portal** — API key management with bcrypt hashing, webhook dispatchers, detailed request logs, and client-scoped API routes.

## 🏗️ Architecture

### Monorepo Structure

The project is organized as a **pnpm workspace + Turborepo** monorepo:

- `apps/admin-dashboard` — Next.js admin control panel
- `apps/agency-web` — Public marketing site with CMS
- `apps/client-portal` — Client-facing dashboard
- `services/auth` — NestJS API gateway (main business logic)
- `services/ai-service` — FastAPI microservice for AI workloads
- `packages/database` — Shared Prisma schema and database utilities
- `packages/ui` — Shared React components
- `packages/types` — Shared TypeScript types
- `packages/config` — Shared configuration

### Tech Stack

|| Layer | Technology |
||-------|------------|
|| Frontend | Next.js 15, React, TypeScript |
|| Backend API | NestJS, TypeScript |
|| AI Service | FastAPI, Python |
|| Database | PostgreSQL (Prisma ORM) |
|| Analytics | MongoDB |
|| Cache | Redis |
|| Monorepo | pnpm workspaces, Turborepo |
|| Deployment | Vercel (frontend), Render (backend Docker) |

## ⚡ Key Features

### Authentication & Security
- JWT-based authentication with HttpOnly cookies
- Refresh token rotation
- Role-based access control (Admin, Employee, Client)
- Global rate limiting (100 requests/minute)
- Helmet security headers and CORS configuration

### CRM & Sales Pipeline
- Lead capture from website forms and manual entry
- Pipeline stages: New → Contacted → Qualified → Proposed → Won
- Contact and organization management
- Lead conversion tracking

### Project Management
- Project creation with client and team assignment
- Sprint and task management with Kanban boards
- Milestone tracking
- Task assignments, priorities, and statuses

### HR & Workforce
- Employee profiles and directory
- Attendance check-in/check-out with daily summaries
- Leave request and review workflow
- Recruitment pipeline with candidate stage tracking

### Payroll & Finance
- Salary structure management by employee
- Automated payslip generation and bulk processing
- Invoice creation and payment tracking
- Expense and subscription management

### Helpdesk & Documents
- Support ticket creation and chat-style messaging
- FAQ system for self-service
- Internal document drive with folders and file management

### AI Platform
- Proposal generation from project requirements
- SEO audit with actionable recommendations
- Professional email writer
- Meeting transcript summarization
- Conversational AI chat assistant

### Analytics & Reporting
- Revenue and client analytics dashboards
- Team performance metrics
- Automated rollup jobs for aggregated data

### Automation Engine
- Event-driven workflow triggers
- Conditional logic and action chains
- Scheduled workflow execution
- Lifecycle event listeners (lead.created, invoice.paid, etc.)

### Developer Tools
- API key generation and management
- Webhook dispatchers with delivery tracking
- Detailed request logging with request IDs
- Client-scoped API routes ensuring data isolation

## 🔌 API Overview

The NestJS API exposes a comprehensive REST interface:

- `POST /api/auth/login` — User login
- `POST /api/auth/register` — User registration
- `GET /api/auth/me` — Current user profile
- `GET /api/health` — Service health check
- `POST /api/projects` — Create project
- `GET /api/projects` — List projects
- `POST /api/hr/employees` — Create employee
- `POST /api/hr/attendance/check-in` — Attendance check-in
- `POST /api/payroll/payslips` — Generate payslips
- `POST /api/ai/proposal` — AI proposal generation
- `GET /api/analytics/dashboard` — Analytics overview
- `POST /api/automation/workflows` — Create workflow
- `POST /api/developer/api-keys` — Generate API key

Swagger documentation is available at `/api/docs` when running locally.

## 🚀 Getting Started

### Prerequisites

- Node.js v20+
- pnpm package manager
- PostgreSQL database
- Redis instance
- Docker (optional, for local infrastructure)

### Installation

```bash
# Install dependencies from monorepo root
pnpm install
```

### Environment Setup

Configure environment variables in `services/auth/.env` and `packages/database/.env`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/trifusion_db
DIRECT_URL=postgresql://user:password@localhost:5432/trifusion_db
MONGODB_URL=mongodb://localhost:27017/trifusion_db
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

### Database Setup

```bash
# Push schema and generate Prisma client
pnpm --filter @agency-os/database db:generate

# Seed database with test data (safe - uses upsert, won't remove existing data)
cd packages/database
npx tsx seed.ts
```

### Development

```bash
# Start all services and apps
pnpm run dev
```

Services will be available at:
- Admin Dashboard: `http://localhost:3000`
- Client Portal: `http://localhost:3001`
- Agency Website: `http://localhost:3002`
- Auth API: `http://localhost:8000`
- AI Service: `http://localhost:8001`

## 🌐 Production Deployment

### Infrastructure

|| Component | Platform |
||-----------|----------|
|| Admin Dashboard | Vercel |
|| Client Portal | Vercel |
|| Agency Website | Vercel |
|| Auth API (NestJS) | Render |
|| AI Service (FastAPI) | Render |
|| PostgreSQL | Neon |
|| Redis | Upstash |

### Backend Docker Build

The auth service builds from the repository root context with the Dockerfile at `services/auth/Dockerfile`. The build installs dependencies, generates Prisma client, and compiles the NestJS application.

## 🧪 Testing

```bash
# Run API integration tests
pnpm run test:api

# Run auth service unit tests
cd services/auth && pnpm test
```

## 📊 Monitoring

- **Sentry** — Error tracking and performance monitoring
- **Pino HTTP** — Structured request logging with request IDs
- **Render Logs** — Backend service logs
- **Vercel Analytics** — Frontend performance data

## 📝 Verification Commands

Before committing any database-related changes, run these verification commands:

```bash
# Lint
pnpm lint

# Type check
pnpm --filter auth-service build

# Tests
pnpm --filter auth-service test

# Migration safety
pnpm --filter database exec -- prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma
```

## 🔐 Database Guidelines

1. **Never use `prisma db push` in production** — always use `prisma migrate deploy`
2. **Always wrap multi-step writes in `$transaction`** — especially auth flows (token rotation)
3. **Always bound `findMany` calls** — add `take:` or use `parsePagination()` from `common/utils/pagination.ts`
4. **Never hardcode database URLs** — use `process.env.DIRECT_URL || process.env.DATABASE_URL`
5. **Always add production guards** to destructive scripts (`NODE_ENV === 'production'` checks)
6. **Use tagged template literals** for raw SQL: `` prisma.$queryRaw`SELECT ...` `` — never `$queryRawUnsafe` with user input
7. **Apply session-level GUCs** in `onModuleInit()` — `statement_timeout`, `idle_in_transaction_session_timeout`

## 📄 License

Private — Built for Trifusion Dynamics.
