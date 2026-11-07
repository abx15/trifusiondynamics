# Deployment Guide

## Deployment components

The repository contains configuration for:

- Next.js public website: `apps/agency-web`
- Next.js operations dashboard: `apps/admin-dashboard`
- NestJS API: `services/auth`
- FastAPI AI service: `services/ai-service`
- Docker Compose development and production stacks
- Render blueprint: `render.yaml`
- GitHub Actions workflows: `.github/workflows/`

The actual provider project names, URLs, environment variables and deployment status can change independently of source control. Confirm current dashboard settings before deploying.

## Guides

- [Production setup](production-setup.md)
- [Comprehensive deployment notes](comprehensive-deployment-guide.md)
- [CI/CD pipeline guide](CI_CD_PIPELINE_GUIDE.md)
- [Production checklist](production-checklist.md)

Older deployment reports may contain historical service names, obsolete routes, outdated environment variables or sample credentials. Treat them as historical notes until reconciled with current manifests and deployment settings.

## Before production

1. Confirm the exact commit and deployment target.
2. Configure unique production secrets and exact CORS origins.
3. Verify database backups and migration plan.
4. Run CI, build and integration tests.
5. Validate Compose/Render/Vercel configuration.
6. Verify health checks and logs after deployment.
7. Test authentication, role authorization and cross-tenant denial.
8. Confirm rollback procedure and responsible operator.
