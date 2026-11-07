# Tenant Isolation

AgencyOS is designed to host multiple organizations in one application. Organization boundaries are a security boundary, not merely a UI filter.

## Required invariants

1. Resolve the authenticated principal from a verified session/token.
2. Resolve the organization context from trusted server-side identity and validated membership.
3. Never accept a request-body, query-string or header organization ID as proof of access.
4. Apply organization scope to every list, detail, update, delete, export, file and background-job query.
5. Verify ownership before changing state or converting records between domains.
6. Include organization scope in cache keys, job payloads, webhook delivery and object-storage authorization where applicable.
7. Use transactions for multi-step operations that must be atomic.
8. Add tests for missing context, cross-organization reads and writes, and privileged cross-tenant access.

## Safe service pattern

```ts
// Illustrative only: use the repository's actual request-context and Prisma APIs.
const organizationId = requestContext.requireOrganizationId();

return prisma.lead.findMany({
  where: { organizationId },
});
```

Do not copy this snippet blindly if model fields or context APIs differ. Inspect the actual service and schema.

## Regression test matrix

| Scenario | Expected result |
|---|---|
| Authenticated user with organization A requests A's record | Allowed if role/permission allows |
| User from A requests organization B record | Denied or not found |
| Client supplies B's organization ID in request body | Ignored/rejected; must not change effective tenant |
| Request has no trusted organization context | Fail closed for tenant-owned data |
| Super-admin performs cross-org action | Allowed only through explicit privileged authorization and audit path |
| Background job processes tenant-owned data | Uses the tenant recorded in a trusted job payload and revalidates ownership |

## PostgreSQL row-level security

Do not enable RLS as a cosmetic hardening measure. If using session variables/GUCs, set them within the same database transaction and connection used for the protected query. Verify connection pooling, transaction propagation and rollback behavior. Application-level filters and RLS can complement each other, but neither should be assumed correct without tests.

## Review checklist

- [ ] Controller has correct authentication and authorization guards.
- [ ] Service derives organization from trusted context.
- [ ] All Prisma reads/writes include organization scope.
- [ ] Nested relations and aggregates cannot leak cross-tenant records.
- [ ] Cache, files, queues, webhooks and exports preserve tenant scope.
- [ ] Tests cover positive and negative cross-tenant cases.
- [ ] Logs do not expose tokens or private tenant data.
