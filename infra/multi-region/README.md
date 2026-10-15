# Multi-Region Active-Passive Deployment Architecture

## Overview

This document describes the active-passive multi-region deployment strategy for AgencyOS with automated failover capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Global Load Balancer                     │
│                      (Cloudflare / Route 53)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │   Primary Region    │         │   Secondary Region  │
    │   (Active)          │         │   (Passive/Warm)    │
    │                     │         │                     │
    │  ┌───────────────┐  │         │  ┌───────────────┐  │
    │  │ API Gateway   │  │         │  │ API Gateway   │  │
    │  │ (NestJS)      │  │         │  │ (NestJS)      │  │
    │  └───────────────┘  │         │  └───────────────┘  │
    │         │           │         │         │           │
    │  ┌──────┴──────┐   │         │  ┌──────┴──────┐   │
    │  │  PostgreSQL │   │ Async   │  │  PostgreSQL │   │
    │  │  (Primary)  │──────Replication──▶│  (Replica)  │   │
    │  └─────────────┘   │         │  └─────────────┘   │
    │         │           │         │         │           │
    │  ┌──────┴──────┐   │         │  ┌──────┴──────┐   │
    │  │   Redis     │   │ Async   │  │   Redis     │   │
    │  │  (Primary)  │──────Replication──▶│  (Replica)  │   │
    │  └─────────────┘   │         │  └─────────────┘   │
    └─────────────────────┘         └─────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
                    ┌─────────────────────┐
                    │  Health Checks &    │
                    │  Failover Monitor   │
                    └─────────────────────┘
```

## Regions

| Region | Provider | Role | Status |
|--------|----------|------|--------|
| us-east-1 | AWS | Primary | Active |
| eu-west-1 | AWS | Secondary | Warm Standby |
| us-west-2 | AWS | Tertiary | Cold Standby |

## Components

### 1. Health Checks

- **Application Health**: `/health` endpoint with deep checks (DB, Redis, external services)
- **Infrastructure Health**: Load balancer, DNS, CDN
- **Data Health**: Replication lag, backup freshness

### 2. Automated Failover

Triggered when:
- Primary region health checks fail for > 3 consecutive checks (90 seconds)
- Primary database becomes unavailable
- Primary region network partition detected
- Manual trigger via ops dashboard

Failover process:
1. Detect failure via health checks
2. Promote secondary database to primary
3. Update DNS/Load Balancer to route to secondary
4. Scale up secondary region capacity
5. Notify on-call team
6. Run post-failover validation

### 3. Data Replication

- **PostgreSQL**: Streaming replication with synchronous_commit = remote_apply for critical data
- **Redis**: Active-passive with Redis Enterprise or manual failover
- **Object Storage**: Cross-region replication (S3 CRR / R2)

### 4. RTO/RPO Targets

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | < 5 minutes |
| RPO (Recovery Point Objective) | < 1 minute (async) / 0 (sync for critical) |
| Failover Detection | < 90 seconds |
| DNS Propagation | < 60 seconds (with low TTL) |

## Implementation Files

- `health-check.ts` - Application health check endpoint
- `failover-controller.ts` - Failover orchestration logic
- `terraform/` - Infrastructure as Code
- `runbooks/` - Operational procedures
- `monitoring/` - Alerting rules and dashboards