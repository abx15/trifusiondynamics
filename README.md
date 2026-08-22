# AgencyOS (Trifusion Dynamics)

AgencyOS is an all-in-one agency management platform that brings together CRM, project management, HR, billing, AI, and developer tools in a single unified system. It is designed for digital agencies that want one coherent backend and multiple frontend experiences — admin, client portal, and public web — without juggling disconnected tools.

---

## What It Does

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

---

## Architecture

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

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, TypeScript |
| Backend API | NestJS, TypeScript |
| AI Service | FastAPI, Python |
| Database | PostgreSQL (Prisma ORM) |
| Analytics | MongoDB |
| Cache | Redis |
| Monorepo | pnpm workspaces, Turborepo |
| Deployment | Vercel (frontend), Render (backend Docker) |

---

## Key Features

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

---

## API Overview

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

---

## Getting Started

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

---

## Production Deployment

### Infrastructure

| Component | Platform |
|-----------|----------|
| Admin Dashboard | Vercel |
| Client Portal | Vercel |
| Agency Website | Vercel |
| Auth API (NestJS) | Render |
| AI Service (FastAPI) | Render |
| PostgreSQL | Neon |
| MongoDB | MongoDB Atlas |
| Redis | Upstash |

### Backend Docker Build

The auth service builds from the repository root context with the Dockerfile at `services/auth/Dockerfile`. The build installs dependencies, generates Prisma client, and compiles the NestJS application.

---

## Testing

```bash
# Run API integration tests
pnpm run test:api

# Run auth service unit tests
cd services/auth && pnpm test
```

---

## Monitoring

- **Sentry** — Error tracking and performance monitoring
- **Pino HTTP** — Structured request logging with request IDs
- **Render Logs** — Backend service logs
- **Vercel Analytics** — Frontend performance data
- **MongoDB Atlas** — Database monitoring and metrics

---

## License

Private — Built for Trifusion Dynamics.
