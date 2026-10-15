# Failover Runbook

## Overview

This runbook describes the procedures for handling failover events in the AgencyOS multi-region deployment.

## Architecture Summary

- **Primary Region**: us-east-1 (Active)
- **Secondary Region**: eu-west-1 (Warm Standby)
- **Tertiary Region**: us-west-2 (Cold Standby)
- **DNS Failover**: Cloudflare Load Balancer with health checks
- **Database**: PostgreSQL streaming replication (async with sync option for critical)
- **Cache**: Redis replication (ElastiCache Global Datastore)
- **Storage**: S3 Cross-Region Replication

## Automated Failover

### Trigger Conditions

Automated failover triggers when:
1. Primary region health checks fail for 3 consecutive checks (90 seconds)
2. Primary database becomes unreachable
3. Primary region network partition detected
4. Manual trigger via ops dashboard

### Automated Process

1. **Detection** (0-90s): Health check service detects primary region failure
2. **Decision** (instant): Failover controller confirms threshold met
3. **Database Promotion** (30-60s): Promote secondary RDS to primary
4. **DNS Update** (30-60s): Update Cloudflare Load Balancer to route to secondary
5. **Scale Up** (60-180s): Scale up secondary EKS node groups
6. **Validation** (30-60s): Run post-failover health checks
7. **Notification** (instant): Alert on-call team via Slack/Email

### Total RTO Target: < 5 minutes

## Manual Failover Procedure

### Prerequisites

- AWS CLI configured with appropriate permissions
- kubectl access to both clusters
- Cloudflare API token
- Access to monitoring dashboards

### Step 1: Verify Failure

```bash
# Check primary region health
curl -f https://api.agencyos.com/health/ready

# Check primary database
aws rds describe-db-instances --db-instance-identifier production-primary-db --region us-east-1

# Check primary Redis
aws elasticache describe-replication-groups --replication-group-id production-primary-redis --region us-east-1

# Check EKS cluster
kubectl --context production-primary get nodes
```

### Step 2: Initiate Failover

```bash
# Option A: Via Failover API (if available)
curl -X POST https://api.agencyos.com/admin/failover \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"target_region": "eu-west-1"}'

# Option B: Manual steps
# 1. Promote secondary database
aws rds promote-read-replica \
  --db-instance-identifier production-secondary-db \
  --region eu-west-1

# 2. Wait for promotion to complete
aws rds wait db-instance-available \
  --db-instance-identifier production-secondary-db \
  --region eu-west-1

# 3. Update DNS (Cloudflare)
# Via Cloudflare dashboard or API
# Update CNAME to point to secondary ALB/endpoint

# 4. Scale up secondary EKS
aws eks update-nodegroup-config \
  --cluster-name production-secondary \
  --nodegroup-name general \
  --scaling-config minSize=3,maxSize=20,desiredSize=5 \
  --region eu-west-1
```

### Step 3: Verify Failover

```bash
# Check new primary health
curl -f https://api.agencyos.com/health/ready

# Verify database writes work
# Run integration tests

# Check monitoring dashboards
# - Grafana: AgencyOS Overview
# - CloudWatch: RDS, ElastiCache, EKS metrics
```

### Step 4: Post-Failover Actions

1. Update status page
2. Notify stakeholders
3. Document incident
4. Begin primary region recovery

## Recovery Procedure (Failback)

### Prerequisites

- Primary region infrastructure healthy
- Database replication caught up
- On-call team available

### Step 1: Verify Primary Region Health

```bash
# Check primary region infrastructure
aws rds describe-db-instances --db-instance-identifier production-primary-db --region us-east-1
aws elasticache describe-replication-groups --replication-group-id production-primary-redis --region us-east-1

# Verify replication lag is minimal
aws rds describe-db-instances --db-instance-identifier production-secondary-db --region eu-west-1 \
  --query 'DBInstances[0].ReplicaLag'
```

### Step 2: Re-establish Replication

```bash
# 1. Stop writes to secondary (drain traffic)
# 2. Wait for replication to catch up (ReplicaLag = 0)
# 3. Promote primary database
aws rds promote-read-replica \
  --db-instance-identifier production-primary-db \
  --region us-east-1

# 4. Set up replication from primary to secondary
# (Requires rebuilding secondary as replica)
```

### Step 3: Switch Traffic Back

```bash
# 1. Update DNS to point to primary
# 2. Wait for DNS propagation (60s with TTL=60)
# 3. Scale down secondary
aws eks update-nodegroup-config \
  --cluster-name production-secondary \
  --nodegroup-name general \
  --scaling-config minSize=2,maxSize=20,desiredSize=2 \
  --region eu-west-1
```

### Step 4: Verify Recovery

```bash
# Run full health checks
curl -f https://api.agencyos.com/health/deep

# Verify all services operational
```

## Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Primary On-Call | | | @oncall-primary |
| Secondary On-Call | | | @oncall-secondary |
| Database Admin | | | @dba-team |
| Platform Lead | | | @platform-lead |

## Escalation

1. **Level 1**: On-call engineer (response: 5 min)
2. **Level 2**: Platform lead (response: 15 min)
3. **Level 3**: Engineering director (response: 30 min)
4. **Level 4**: CTO (response: 60 min)

## Communication

During failover:
1. Post to #incidents Slack channel
2. Update status page (status.agencyos.com)
3. Send email to stakeholders
4. Document in incident tracker

## Testing

### Monthly Failover Drill

1. Schedule during low-traffic window
2. Execute manual failover procedure
3. Verify RTO < 5 minutes
4. Execute failback procedure
5. Document results and improve

### Quarterly Full DR Test

1. Simulate complete primary region loss
2. Execute full failover to secondary
3. Operate from secondary for 4 hours
4. Execute failback
5. Update runbooks based on findings

## Monitoring Dashboards

- **Grafana**: `https://grafana.agencyos.com/d/agencyos-multi-region`
- **CloudWatch**: RDS, ElastiCache, EKS, ALB metrics
- **Cloudflare**: Load balancer analytics, DNS analytics

## Key Metrics to Watch

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| API Latency (p99) | < 200ms | > 500ms | > 1s |
| Error Rate | < 0.1% | > 1% | > 5% |
| DB CPU | < 50% | > 70% | > 85% |
| DB Connections | < 500 | > 700 | > 900 |
| Replication Lag | < 1s | > 10s | > 60s |
| Redis Memory | < 60% | > 75% | > 90% |
| EKS Node CPU | < 60% | > 80% | > 90% |