# AgencyOS (Trifusion Dynamics)

Welcome to **AgencyOS** (Trifusion Dynamics) — a comprehensive, enterprise-grade Next-Gen Agency Management System.

This platform consolidates operations, billing, project management, client relations, HR, and powerful AI capabilities into a single unified monorepo. It is built to power modern digital agencies end-to-end.

---

## 🏗️ Architecture & Tech Stack

This project utilizes a modern **Monorepo** architecture powered by `pnpm` workspaces and **Turborepo** for optimal caching and fast build pipelines.

### Frontend Applications (Next.js 15)
- **apps/admin-dashboard**: Core operations control panel for Admins and Employees
- **apps/auth-gateway**: Standalone authentication service
- **apps/agency-web**: Public marketing website with CMS
- **apps/client-portal**: Client-facing hub for tickets, invoices, and project tracking

### Backend Services
- **services/auth**: NestJS API Gateway - Main business logic, RBAC, client scope routes
- **services/ai-service**: FastAPI Python microservice - AI integrations (LLMs, generators, analytics)

### Databases & Infrastructure
- **PostgreSQL**: Primary database via Neon (Prisma ORM)
- **MongoDB**: NoSQL analytics via MongoDB Atlas
- **Redis**: Caching layer via Upstash
- **Shared Packages**: 
  - `packages/database`: Unified Prisma schema (40+ models)
  - `packages/ui`: Shared React components
  - `packages/types`: TypeScript type definitions
  - `packages/config`: Shared configuration

### Deployment Architecture
- **Frontend**: Vercel (Serverless Next.js deployment)
- **Backend**: Render (Node.js & Docker containers)
- **Databases**: Neon (PostgreSQL), MongoDB Atlas, Upstash (Redis)

---

## 🚀 The 10 Phases of Development

This platform was constructed across 10 extensive development phases, each introducing a core operational module:

### Phase 1: Authentication & Core Setup
- Multi-role RBAC implementation (Admin, Employee, Client).
- JWT generation, refresh tokens, secure password hashing, and Next.js Auth integration.

### Phase 2: CMS & Marketing
- Public-facing components and admin controllers for Blogs, Portfolios, Services, and Testimonials.
- Form submissions feeding directly into raw marketing Leads.

### Phase 3: CRM & Client Management
- Sales pipeline mapping: from raw Leads to Quoted, Follow-up, and Won.
- Client conversions, organizational mapping, and secure Contact profiles.

### Phase 4: Projects & ERP
- Full Project management suites: Sprints, Tasks (Kanban-ready), Milestones.
- ERP Dashboards mapping resource allocations across teams.

### Phase 5: Billing & Finance
- Financial engine for Estimates, Invoices, Subscriptions, and Expenses.
- Payment recording and tracking (Pending, Partially Paid, Paid).

### Phase 6: Helpdesk & Document Management (Drive)
- Support Tickets with real-time Chat Messaging capabilities.
- FAQ system and a secure internal Document Drive (Folders/Files).

### Phase 7: HR & Payroll
- Internal employee tracking, recruitment pipelines, and candidate stages.
- Attendance (Punches), Leave requests, Salary Structures, and Payslip generation.

### Phase 8: AI Platform
- Dedicated `ai-service` (FastAPI).
- AI modules: Proposal Generator, SEO Audit, Email Writer, Meeting Summary, and AI Chat Assistant.

### Phase 9: Analytics & Automation
- Rollup aggregations for Revenue and Client metrics.
- A Workflow Automation engine (Triggers, Conditions, Actions) listening to lifecycle events (e.g., `lead.created`, `invoice.paid`).

### Phase 10: Developer API & Gateway
- Client Portal API scoped routes (ensuring Clients only access their organization's data).
- Developer Dashboard: API Key generation (bcrypt hashed), webhook dispatchers, and detailed Request Logs.

---

## 🧪 Testing & Quality Assurance

We maintain strict quality through layered testing:

1. **Unit Testing (Jest)**
   - NestJS modules are rigorously covered using `jest-mock-extended` mimicking the Prisma database interactions. Services achieve >80% coverage.
2. **E2E API Integration (Postman & Newman)**
   - Includes a robust 15-step `00-Full-Flow-Smoke-Test` Postman collection simulating the complete business lifecycle (Register -> Convert Lead -> Create Project/Invoice -> Pay -> Support Ticket -> AI -> Workflows).
   - Can be run automatically via the Newman CLI pipeline.

---

## 💻 Getting Started

### Prerequisites
- Node.js (v20+)
- Python 3.9+ (for `ai-service`)
- `pnpm` package manager
- Docker (optional, for local Postgres/Redis/Mongo)

### 1. Installation
Install all monorepo dependencies from the root:
```bash
pnpm install
```

### 2. Environment Setup
Rename `.env.example` to `.env` in the root and `packages/database`, updating the database credentials to point to your local or hosted Postgres database.

### 3. Database Migration
Push the Prisma schema to your database and generate the Prisma Client:
```bash
pnpm --filter database db:push
pnpm --filter database db:generate
```

### 4. Running the Project
Start all services and applications concurrently via Turborepo:
```bash
pnpm run dev
```
- Admin Dashboard: `http://localhost:3000`
- Client Portal: `http://localhost:3001`
- NestJS API: `http://localhost:8000/api`
- AI Service: `http://localhost:8001`

### 5. Running Automated API Tests
To verify backend integrity locally using the mock stubs:
```bash
pnpm run test:api
```
This executes the Newman runner against the generated Postman collection.

---

## 🚀 Production Deployment

### Quick Deployment Overview

**Frontend (Vercel)**
- admin-dashboard → Vercel
- auth-gateway → Vercel
- agency-web → Vercel
- client-portal → Vercel

**Backend (Render)**
- services/auth → Render (NestJS)
- services/ai-service → Render (Docker)

**Databases (External)**
- PostgreSQL → Neon
- MongoDB → MongoDB Atlas
- Redis → Upstash

### Detailed Deployment Guide

For complete step-by-step deployment instructions, including:
- Database setup (Neon, MongoDB Atlas, Upstash)
- Backend deployment on Render
- Frontend deployment on Vercel
- Environment configuration
- CORS setup
- AI service configuration

👉 **[Read Complete Deployment Guide](docs/deployment/comprehensive-deployment-guide.md)**

### Environment Variables

Required environment variables for production:

```bash
# Database
DATABASE_URL=postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
MONGODB_URL=mongodb+srv://user:password@cluster0.xyz.mongodb.net/agency_analytics
REDIS_URL=redis://default:password@xyz.upstash.io:6379

# JWT Secrets
JWT_ACCESS_SECRET=your-64-char-random-secret
JWT_REFRESH_SECRET=your-64-char-random-secret

# Admin
ADMIN_EMAIL=admin@trifusiondynamics.com
ADMIN_PASSWORD=your-secure-password
DEFAULT_TEMP_PASSWORD=Welcome@123

# CORS
CORS_ALLOWED_ORIGINS=https://your-admin.vercel.app,https://your-auth.vercel.app
COOKIE_DOMAIN=

# AI Services (Optional)
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key

# Frontend URLs
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_AUTH_GATEWAY_URL=https://your-auth.vercel.app
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://your-admin.vercel.app
NEXT_PUBLIC_CLIENT_PORTAL_URL=https://your-client.vercel.app
NEXT_PUBLIC_AGENCY_WEB_URL=https://your-web.vercel.app
```

---

## 🤖 AI Service Features

The AI service (`services/ai-service`) provides:

- **Proposal Generator** - Generate business proposals from requirements
- **SEO Audit** - Website SEO analysis and recommendations
- **Email Writer** - Professional email generation
- **Meeting Summary** - Meeting transcript summarization
- **AI Chat Assistant** - Conversational AI interface

### AI Providers (Priority Order)
1. **Gemini** (Google) - Primary if key available
2. **Anthropic** (Claude) - Secondary
3. **OpenAI** (GPT) - Tertiary
4. **Mock Mode** - Fallback for testing without keys

### Testing AI Service
```bash
# Health check
curl https://agency-os-ai-service.onrender.com/health

# Test chat
curl -X POST https://agency-os-ai-service.onrender.com/internal/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

---

## 📊 Monitoring & Logging

- **Sentry** - Error tracking (integrated)
- **Render Logs** - Backend logs
- **Vercel Analytics** - Frontend analytics
- **MongoDB Atlas** - Database monitoring

---

## 🔧 Troubleshooting

### Common Issues

**Database Connection Failed**
- Check DATABASE_URL format
- Verify IP whitelist in MongoDB Atlas
- Ensure SSL mode is enabled

**CORS Errors**
- Update CORS_ALLOWED_ORIGINS with actual Vercel URLs
- Check frontend API_URL configuration

**AI Service Not Responding**
- Verify API keys are set
- Check Render service logs
- Test health endpoint

**Build Failures**
- Ensure pnpm is installed
- Check Node.js version (20+)
- Verify all dependencies are installed

---

*Built with ❤️ for Trifusion Dynamics.*
