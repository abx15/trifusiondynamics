# Project Roadmap

This roadmap is planning, not a delivery promise. Track accepted work through GitHub issues and milestones. Code presence alone does not establish production readiness.

## P0 — Security and release confidence
- [ ] Resolve and verify high/critical dependency advisories; review regenerated lockfile.
- [ ] Audit API authorization and role/permission coverage; do not rely on route inventory labels.
- [ ] Expand tenant-isolation tests across billing, projects, files, reports, jobs and webhooks.
- [ ] Verify transaction-scoped tenant context before PostgreSQL RLS rollout.
- [ ] Validate production Compose and deployment manifests against actual ports, health checks and secrets.
- [ ] Establish tested backup/restore drills and production release evidence.

## P1 — Developer experience
- [ ] Keep OpenAPI snapshots and route inventory synchronized with runtime code.
- [ ] Add deterministic CI tests for NestJS, Next.js and FastAPI.
- [ ] Document synthetic demo seed data and local reset workflow.
- [ ] Add E2E tests for authentication, role redirects, CRM conversion, invoices and tickets.
- [ ] Publish supported-version and release policies.
- [ ] Select and publish an explicit repository license and contribution terms.

## P2 — Product completeness
- [ ] Audit UI/API parity and identify incomplete or stubbed flows.
- [ ] Improve notification delivery observability and preferences.
- [ ] Expand webhook retry, dead-letter and replay controls.
- [ ] Document analytics definitions and calculation semantics.
- [ ] Add accessibility and responsive regression coverage.
- [ ] Expand tenant-aware audit logs and sensitive export controls.

## P3 — Proposed integrations
- [ ] Payment providers with verified webhooks and reconciliation.
- [ ] Accounting and invoicing integrations.
- [ ] Cloud storage and document-signing workflows.
- [ ] Email/calendar connectors with least-privilege OAuth.
- [ ] CRM import/export connectors with validation and audit trails.
- [ ] AI provider routing, budgets, evaluations and tenant controls.
- [ ] Public API versioning, SDKs and developer examples.

## Propose a feature or service

Open a GitHub Discussion with the problem, target users, workflow, acceptance criteria, core-vs-optional scope, tenant/data model, security/privacy impact, external costs, operational owner and test plan.

**Status meanings:** Implemented = code exists, not necessarily production-certified; In progress = active work; Planned = accepted for consideration; Proposal = awaiting triage.
