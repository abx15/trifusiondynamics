# AgencyOS CI/CD Pipeline Guide

> **Version:** 2.0  
> **Last Updated:** 2026-10-11  
> **Platform:** GitHub Actions  
> **Deployment Targets:** Vercel (Frontend), Render (Backend)

---

## 📊 Pipeline Overview

```mermaid
graph TB
    subgraph "Push to main"
        A[GitHub Push]
    end

    subgraph "CI Pipeline"
        B[Setup & Cache]
        C[Lint All Packages]
        D[Type Check All]
        E[Unit Tests]
        F[Build All]
        G[Security Audit]
        H[DB Validation]
    end

    subgraph "CD Pipeline"
        I[Pre-deploy Checks]
        J[Build Services]
        K[Deploy Auth Service]
        L[Deploy AI Service]
        M[Deploy Agency Web]
        N[Deploy Admin Dashboard]
        O[Post-deploy Tests]
    end

    subgraph "Notifications"
        P[Summary Report]
        Q[Slack/Discord]
    end

    A --> B
    B --> C
    B --> D
    B --> E
    B --> H
    B --> G
    C --> F
    D --> F
    E --> F
    F --> I
    I --> J
    J --> K
    J --> L
    J --> M
    J --> N
    K --> O
    L --> O
    M --> O
    N --> O
    O --> P
    P --> Q

    style A fill:#4CAF50,color:#fff
    style B fill:#2196F3,color:#fff
    style F fill:#FF9800,color:#fff
    style O fill:#9C27B0,color:#fff
    style P fill:#E91E63,color:#fff
```

---

## 🔄 CI Pipeline (Continuous Integration)

### Workflow File: `.github/workflows/ci-improved.yml`

#### Triggers

| Event | Branches | Conditions |
|-------|----------|------------|
| Push | `main`, `develop` | Ignores docs/** and *.md |
| Pull Request | `main`, `develop` | Ignores docs/** and *.md |
| Manual | Any | Via workflow_dispatch |

#### Job Matrix

```mermaid
graph LR
    subgraph "Parallel Jobs"
        A[Lint]
        B[Type Check]
        C[Unit Tests]
        D[Security]
        E[DB Validation]
    end

    subgraph "Dependent Jobs"
        F[Build]
        G[Build Size]
    end

    A --> F
    B --> F
    C --> F
    D --> F
    E --> F
    F --> G

    style A fill:#4CAF50
    style B fill:#2196F3
    style C fill:#FF9800
    style D fill:#9C27B0
    style E fill:#E91E63
    style F fill:#00BCD4
    style G fill:#607D8B
```

### Job Details

#### 1. Setup Job

**Purpose:** Install dependencies and setup caches

```yaml
- pnpm setup (v10)
- Node.js setup (v20)
- pnpm store cache
- Install dependencies with --frozen-lockfile
```

**Cache Strategy:**
- pnpm store: `pnpm-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}`
- Turbo cache: `turbo-${{ runner.os }}-${{ github.sha }}`

#### 2. Lint Job

**Purpose:** Check code quality across all packages

**Matrix:**
- agency-web
- admin-dashboard
- auth
- database
- types

**Command:** `pnpm --filter <package> lint`

#### 3. Type Check Job

**Purpose:** Validate TypeScript types

**Matrix:** Same as lint

**Command:** `pnpm --filter <package> typecheck` or `build`

#### 4. Unit Tests Job

**Purpose:** Run unit tests with coverage

**Services:**
- PostgreSQL 16 (agencyos_test)
- Redis 7

**Environment Variables:**
```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/agencyos_test
REDIS_URL: redis://localhost:6379
JWT_ACCESS_SECRET: test-secret-access
JWT_REFRESH_SECRET: test-secret-refresh
NODE_ENV: test
```

**Steps:**
1. Generate Prisma client
2. Push test schema
3. Run tests with coverage
4. Upload to Codecov

#### 5. Build Job

**Purpose:** Build all packages and apps

**Matrix:** Same as lint

**Steps:**
1. Restore Turbo cache
2. Build each package
3. Upload build artifacts

**Artifacts:**
- agency-web/.next
- admin-dashboard/.next
- auth/dist
- database/dist
- types/dist

#### 6. Security Audit Job

**Purpose:** Scan for vulnerabilities

**Tools:**
- pnpm audit (moderate threshold)
- Snyk (high threshold)

**Steps:**
1. Run pnpm audit
2. Run Snyk scan
3. Upload SARIF to GitHub

#### 7. Database Validation Job

**Purpose:** Validate Prisma schema

**Services:**
- PostgreSQL 16 (agencyos_ci)

**Steps:**
1. Generate Prisma client
2. Validate schema
3. Check format
4. Check for drift
5. Migration diff check

#### 8. Build Size Job

**Purpose:** Report build sizes on PRs

**Condition:** Only on pull_request

**Steps:**
1. Download build artifacts
2. Calculate sizes
3. Comment on PR

**Output:**
```
Agency Web: 150MB
Admin Dashboard: 200MB
Auth Service: 50MB
```

#### 9. Summary Job

**Purpose:** Aggregate results

**Output:** GitHub Actions summary table

---

## 🚀 CD Pipeline (Continuous Deployment)

### Workflow File: `.github/workflows/deploy-improved.yml`

#### Triggers

| Event | Branches | Conditions |
|-------|----------|------------|
| Push | `main` | Automatic |
| Manual | Any | Via workflow_dispatch with options |

#### Manual Deployment Options

```yaml
deploy-auth: true/false
deploy-ai: true/false
deploy-frontend: true/false
```

### Job Details

#### 1. Pre-deploy Checks

**Purpose:** Validate deployment conditions

**Checks:**
- Branch must be `main`
- Working directory must be clean

#### 2. Build Job

**Purpose:** Build all services for deployment

**Steps:**
1. Install dependencies
2. Build all packages
3. Upload artifacts

#### 3. Deploy Auth Service

**Platform:** Render

**Environment:** auth-service-production

**Steps:**
1. Deploy using johnbeynon/render-deploy-action
2. Wait for success
3. Health check (10 attempts, 10s interval)

**Health Check:**
```bash
curl -f https://trifusiondynamics-api.onrender.com/health
```

#### 4. Deploy AI Service

**Platform:** Render

**Environment:** ai-service-production

**Steps:** Same as Auth Service

**Health Check:**
```bash
curl -f https://trifusiondynamics-ai-api.onrender.com/health
```

#### 5. Deploy Agency Web

**Platform:** Vercel

**Environment:** agency-web-production

**Steps:**
1. Install dependencies in apps/agency-web
2. Deploy using amondnet/vercel-action
3. Deploy with --prod flag
4. Health check (10 attempts, 10s interval)

**Health Check:**
```bash
curl -f https://trifusiondynamics.vercel.app
```

#### 6. Deploy Admin Dashboard

**Platform:** Vercel

**Environment:** admin-dashboard-production

**Steps:** Same as Agency Web

**Health Check:**
```bash
curl -f https://trifusiondynamicsadmin.vercel.app
```

#### 7. Post-deployment Tests

**Purpose:** Validate all services are healthy

**Tests:**
- Auth Service health
- AI Service health
- Agency Web health
- Admin Dashboard health

#### 8. Summary Job

**Purpose:** Generate deployment report

**Output:**
- Job status table
- Production URLs
- Deployment timestamp
- Commit SHA

---

## 🔐 Required Secrets

### GitHub Secrets

| Secret | Description | Required For |
|--------|-------------|--------------|
| `RENDER_AUTH_SERVICE_ID` | Render service ID for Auth Service | Deploy |
| `RENDER_AI_SERVICE_ID` | Render service ID for AI Service | Deploy |
| `RENDER_API_KEY` | Render API key | Deploy |
| `VERCEL_TOKEN` | Vercel authentication token | Deploy |
| `VERCEL_ORG_ID` | Vercel organization ID | Deploy |
| `VERCEL_PROJECT_ID_AGENCY_WEB` | Vercel project ID for Agency Web | Deploy |
| `VERCEL_PROJECT_ID_ADMIN_DASHBOARD` | Vercel project ID for Admin Dashboard | Deploy |
| `SNYK_TOKEN` | Snyk API token | Security |
| `CODECOV_TOKEN` | Codecov token | Coverage |
| `TURBO_TOKEN` | Turborepo token (optional) | Build cache |
| `TURBO_TEAM` | Turborepo team (optional) | Build cache |

### Environment Variables (Not Secrets)

```yaml
PNPM_VERSION: '10'
NODE_VERSION: '20'
NEXT_TELEMETRY_DISABLED: '1'
NEXT_PUBLIC_API_URL: https://trifusiondynamics-api.onrender.com/api
```

---

## 📊 Pipeline Performance

### Typical Execution Times

| Job | Duration |
|-----|----------|
| Setup | 1-2 min |
| Lint (parallel) | 2-3 min |
| Type Check (parallel) | 3-4 min |
| Unit Tests | 3-5 min |
| Build (parallel) | 4-6 min |
| Security | 2-3 min |
| DB Validation | 1-2 min |
| **Total CI** | **10-15 min** |
| Deploy Auth | 3-5 min |
| Deploy AI | 3-5 min |
| Deploy Frontends | 2-3 min each |
| Post-deploy Tests | 1-2 min |
| **Total CD** | **10-15 min** |

### Optimization Strategies

1. **Caching:** pnpm store + Turbo cache reduces dependency install time by 80%
2. **Parallel Jobs:** Lint, type check, and security run in parallel
3. **Matrix Builds:** Build multiple packages simultaneously
4. **Artifact Reuse:** Build artifacts reused in deploy job

---

## 🛠️ Local Development Setup

### Run CI Locally

```bash
# Install dependencies
pnpm install

# Run lint
pnpm lint

# Run type check
pnpm typecheck

# Run tests
pnpm test

# Build all
pnpm build

# Security audit
pnpm audit
```

### Test Database Locally

```bash
# Start PostgreSQL
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agencyos_test \
  postgres:16-alpine

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agencyos_test"
export REDIS_URL="redis://localhost:6379"

# Run tests
pnpm --filter auth test
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Cache Miss

**Symptom:** Slow dependency installation

**Solution:**
```yaml
# Check cache key format
key: pnpm-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
```

#### 2. Build Failure

**Symptom:** Build job fails with TypeScript errors

**Solution:**
- Check type check job output
- Run `pnpm typecheck` locally
- Fix TypeScript errors

#### 3. Test Failure

**Symptom:** Unit tests fail in CI but pass locally

**Solution:**
- Check environment variables
- Ensure PostgreSQL and Redis are accessible
- Check test database schema

#### 4. Deployment Health Check Failure

**Symptom:** Deployment succeeds but health check fails

**Solution:**
- Increase wait time in health check
- Check service logs on Render/Vercel
- Verify service is actually running

#### 5. Security Scan Failures

**Symptom:** Snyk or pnpm audit finds vulnerabilities

**Solution:**
- Update vulnerable packages
- If false positive, mark as acceptable
- Document exceptions

---

## 📈 Monitoring & Observability

### Pipeline Metrics

**GitHub Actions Dashboard:**
- Success rate
- Average duration
- Failed runs

**Custom Metrics to Track:**
- Build size trends
- Test coverage trends
- Security vulnerability count
- Deployment frequency

### Alerts

**Recommended Alerts:**
- CI failure on main branch
- Deployment failure
- Security vulnerabilities detected
- Build size increase > 20%

---

## 🎯 Best Practices

### CI/CD Best Practices

1. **Fast Feedback:** Keep CI under 15 minutes
2. **Fail Fast:** Run quick checks first (lint, type check)
3. **Parallelize:** Run independent jobs in parallel
4. **Cache Effectively:** Use pnpm and Turbo caches
5. **Artifacts:** Only upload necessary artifacts
6. **Security:** Never log secrets
7. **Idempotency:** Deployments should be repeatable
8. **Rollback:** Keep previous version ready
9. **Health Checks:** Always verify deployments
10. **Documentation:** Keep this guide updated

### Branch Strategy

```
main
  ├── Auto-deploy to production
  └── Protected branch

develop
  ├── Auto-run CI
  └── Manual deploy to staging

feature/*
  ├── Auto-run CI
  └── No deployment
```

---

## 🔄 Migration from Old CI/CD

### Changes Made

| Old | New | Benefit |
|-----|-----|---------|
| Single CI workflow | Improved CI workflow | Better organization |
| Simple deploy | Improved deploy workflow | Health checks, options |
| No matrix | Matrix builds | Parallel execution |
| No security scan | Snyk + pnpm audit | Better security |
| No build size report | Build size on PR | Performance tracking |
| No summary | GitHub summary | Better visibility |

### Migration Steps

1. **Backup old workflows:**
   ```bash
   mv .github/workflows/ci.yml .github/workflows/ci.yml.backup
   mv .github/workflows/deploy.yml .github/workflows/deploy.yml.backup
   ```

2. **Add new workflows:**
   - ci-improved.yml
   - deploy-improved.yml

3. **Test in PR:**
   - Create feature branch
   - Push changes
   - Verify CI passes

4. **Merge to main:**
   - Merge PR
   - Verify deployment succeeds

5. **Remove old workflows:**
   ```bash
   rm .github/workflows/ci.yml.backup
   rm .github/workflows/deploy.yml.backup
   rm .github/workflows/backend-ci.yml
   rm .github/workflows/frontend-ci.yml
   ```

---

## 📚 Related Documentation

- [Production Setup](production-setup.md) - Production deployment guide
- [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md) - Overall architecture
- [Database Schema Complete Guide](../DATABASE_SCHEMA_COMPLETE_GUIDE.md) - Database documentation

---

**Document Status:** ✅ Complete  
**Last Review:** 2026-10-11  
**Next Review:** 2026-11-11
