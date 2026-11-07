# Production Release Checklist

## Before release

- [ ] Confirm reviewed commit SHA and target environment.
- [ ] Required CI jobs pass; skipped checks are explicitly recorded.
- [ ] Build artifacts are generated from the same commit being deployed.
- [ ] Dependency and container-image advisories are reviewed.
- [ ] No credentials, debug dumps or customer data are present in the release.
- [ ] Production environment variables are configured in the secret manager.
- [ ] JWT secrets are unique, strong and different from staging/local.
- [ ] CORS contains only approved production origins.
- [ ] AI provider keys and internal service secrets are scoped and protected.
- [ ] Database backup is recent and restore procedure is known.
- [ ] Prisma migrations are reviewed and tested on a staging copy.
- [ ] No destructive schema operation is part of an unreviewed deploy.

## Release

- [ ] Deploy API and AI service using the approved strategy.
- [ ] Deploy frontend applications with matching API URLs.
- [ ] Verify health endpoints and application startup logs.
- [ ] Verify API docs are exposed only as intended.
- [ ] Verify login, refresh, logout and session expiry.
- [ ] Verify role permissions and cross-organization isolation.
- [ ] Verify billing, file, webhook and AI workflows relevant to the release.
- [ ] Verify request IDs, monitoring and alert routing.

## After release

- [ ] Run smoke tests against production with non-destructive test accounts.
- [ ] Review error rates, latency and background-job queues.
- [ ] Confirm backup jobs and storage lifecycle policies.
- [ ] Record deployed SHA, time, operator and migration version.
- [ ] Keep rollback steps available until release health is confirmed.

A checked box is an operator assertion, not an automated guarantee. Record evidence for high-risk checks.
