# Documentation

This directory contains technical references and operational runbooks for AgencyOS.

## Start here

- [Project README](../README.md) — overview, quick start, commands and links.
- [Architecture](architecture/README.md) — application boundaries, service responsibilities and tenant isolation.
- [Development](development/README.md) — local setup, configuration and testing.
- [API documentation](api/README.md) — runtime OpenAPI references and route inventory.
- [Deployment](deployment/README.md) — deployment topology and production checklist.
- [Operations](operations/README.md) — database, backup, recovery and security operations.
- [Roadmap](ROADMAP.md) — known work, proposed improvements and contribution ideas.

## Existing technical references

The repository also contains detailed reports and implementation notes. Treat audit reports as point-in-time snapshots; verify their recommendations against current code and infrastructure before executing them.

### Architecture
- [System architecture](architecture/SYSTEM_ARCHITECTURE.md)
- [Architecture patterns and layers](architecture/ARCHITECTURE_PATTERNS_LAYERS.md)
- [Authentication flow](architecture/auth-flow.md)
- [Ecosystem overview](architecture/ecosystem.md)
- [Actual route inventory](architecture/actual-routes.md)
- [Tenant isolation principles](architecture/tenant-isolation.md)

### Database and infrastructure
- [Database schema guide](DATABASE_SCHEMA_COMPLETE_GUIDE.md)
- [Database schema audit](DATABASE_SCHEMA_AUDIT.md)
- [PostgreSQL audit](POSTGRESQL_AUDIT.md)
- [PostgreSQL hardening report](POSTGRESQL_PRODUCTION_HARDENING_REPORT.md)
- [Redis architecture](REDIS_ARCHITECTURE.md)
- [Redis operations](REDIS_OPERATIONS.md)
- [Redis hardening report](REDIS_PRODUCTION_HARDENING_REPORT.md)
- [Backup and recovery](DATABASE_BACKUP_AND_RECOVERY.md)
- [Restore procedure](RESTORE_PROCEDURE.md)

### Security and deployment
- [CI/CD pipeline guide](deployment/CI_CD_PIPELINE_GUIDE.md)
- [Production setup](deployment/production-setup.md)
- [Cloudflare production setup](CLOUDFLARE_PRODUCTION_SETUP.md)
- [Cloudflare edge security report](CLOUDFLARE_EDGE_SECURITY_REPORT.md)
- [Secret rotation checklist](SECRET_ROTATION_CHECKLIST.md)
- [File security](FILE_SECURITY.md)
- [Data deletion policy](DATA_DELETION_POLICY.md)

### API references
- [OpenAPI snapshot](swagger.json)
- [Route inventory](architecture/actual-routes.md)

## Documentation maintenance

When changing a service, API, schema, environment variable, permission model or deployment workflow:

1. Update the relevant guide in the same pull request.
2. Keep examples aligned with actual package scripts and current source.
3. Mark proposed or unverified behavior as such.
4. Never include real credentials, seeded passwords, private customer data or production endpoints that are not intended for publication.
5. Prefer runnable commands and explain prerequisites, expected results and failure recovery.
