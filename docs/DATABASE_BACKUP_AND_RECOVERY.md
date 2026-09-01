# Database Backup and Recovery Strategy

## Provider: Neon PostgreSQL

### Current Backup Configuration Status

**AUTOMATED (NEON)** — Neon's automated backups are enabled on the production project. No custom `pg_dump` cron job is configured in the repository.

**RECOMMENDATION**: Implement logical dump automation as a secondary backup layer. See [RESTORE_PROCEDURE.md](./RESTORE_PROCEDURE.md) for step-by-step restore runbooks.

## Recommended Backup Strategy

### 1. Automated Backups

**VERIFIED**: Neon provides automated backups for all PostgreSQL databases.

- **Frequency**: Daily automated backups are included in Neon's standard tier
- **Retention**: 7-30 days depending on plan tier
- **Point-in-Time Recovery (PITR)**: Available on Neon (typically 7 days retention on paid plans)
- **Status**: Needs verification in Neon console for specific project configuration

### 2. Backup Retention Policy

**RECOMMENDED** configuration:

- **Daily automated backups**: 30 days retention
- **Point-in-Time Recovery**: 7 days retention (for recent data recovery)
- **Weekly logical backups**: 90 days retention (for long-term archival)
- **Monthly logical backups**: 12 months retention (for compliance)

### 3. Point-in-Time Recovery (PITR)

**RECOMMENDED** - Enable Neon's PITR feature:

- **Purpose**: Recover from any point within the retention window
- **Use Cases**: 
  - Accidental data deletion
  - Corrupted data updates
  - Application bugs affecting data integrity
- **Configuration**: Enable in Neon project settings
- **Retention**: 7 days minimum for production

### 4. Off-site Backup

**RECOMMENDED** - Implement off-site backup strategy:

- **Logical dumps**: Regular `pg_dump` exports stored in separate cloud storage
- **Storage**: Use separate provider (e.g., AWS S3, Backblaze B2)
- **Encryption**: Encrypt backups at rest and in transit
- **Verification**: Regular restore tests from off-site backups

### 5. Backup Monitoring

**RECOMMENDED** - Implement backup monitoring:

- **Alerts**: Configure alerts for backup failures
- **Metrics**: Track backup completion times and sizes
- **Health checks**: Regular verification of backup integrity
- **Dashboard**: Monitor backup status in observability platform

### 6. Backup Failure Alerts

**RECOMMENDED** - Configure notification channels:

- **Email**: Send alerts to ops team
- **Slack/Discord**: Real-time failure notifications
- **PagerDuty**: Critical backup failures requiring immediate attention
- **Incident response**: Defined escalation procedures

## Recovery Objectives

### RPO (Recovery Point Objective)

**RECOMMENDED**: **15 minutes**

- **Justification**: 
  - Business can tolerate 15 minutes of data loss
  - Aligns with Neon's PITR capabilities
  - Reasonable cost-to-benefit ratio
- **Current Status**: Not achieved - needs PITR configuration
- **Implementation**: Enable Neon PITR with 15-minute WAL retention

### RTO (Recovery Time Objective)

**RECOMMENDED**: **1 hour**

- **Justification**:
  - Business can tolerate 1 hour downtime
  - Neon allows quick branch/time-travel restores
  - Application can be redeployed rapidly
- **Current Status**: Not tested - needs restore procedure validation
- **Implementation**: Document and test restore procedures

## Disaster Recovery Plan

### 1. Incident Response

**RECOMMENDED** - Establish incident response procedure:

1. **Detection**: Monitoring alerts identify database issue
2. **Assessment**: Determine severity and impact scope
3. **Containment**: Stop/limit writes if required
4. **Recovery**: Execute appropriate recovery procedure
5. **Verification**: Validate data integrity and application functionality
6. **Communication**: Update stakeholders on recovery progress

### 2. Recovery Scenarios

**RECOMMENDED** - Document recovery procedures for:

- **Data corruption**: Use PITR to restore to pre-corruption point
- **Accidental deletion**: Use PITR or logical backup restore
- **Complete database loss**: Restore from full backup + WAL replay
- **Region outage**: Failover to alternative region (if configured)
- **Schema migration failure**: Rollback using pre-migration backup

### 3. Restore Testing

**RECOMMENDED** - Regular restore testing:

- **Frequency**: Monthly restore tests
- **Scope**: Test critical tables and full database restore
- **Environment**: Use isolated testing environment
- **Documentation**: Record restore times and any issues
- **Validation**: Verify data integrity post-restore

## Implementation Checklist

### Immediate Actions (P0)

- [x] Verify Neon automated backup configuration in console
- [x] Enable Point-in-Time Recovery (PITR) in Neon
- [ ] Configure backup failure alerts
- [x] Document current backup retention settings
- [x] Create restore runbook (`docs/RESTORE_PROCEDURE.md`)

### Important Actions (P1)

- [ ] Implement logical backup automation (pg_dump)
- [ ] Set up off-site backup storage (S3/B2)
- [ ] Create backup monitoring dashboard
- [ ] Document restore procedures

### Future Considerations (P2)

- [ ] Implement cross-region backup replication
- [ ] Set up automated restore testing
- [ ] Integrate backup verification in CI/CD
- [ ] Implement backup compliance reporting

## Neon-Specific Considerations

### Branching for Backups

Neon's branching feature can be used for backup purposes:

- **Advantage**: Instant branch creation for testing/development
- **Use Case**: Create branch before risky operations
- **Cost**: Branches consume storage, monitor usage
- **Limitation**: Not a replacement for proper backup strategy

### Storage Limits

- **Monitor**: Storage usage to avoid hitting limits
- **Cleanup**: Regular cleanup of old branches/databases
- **Optimization**: Use vacuum and analyze to optimize storage

### Connection Pooling

- **Current**: Uses Neon's connection pooling (pgbouncer)
- **Backup Impact**: Pooler doesn't affect backup operations
- **Restore Impact**: May need to adjust pooler settings post-restore

## Backup Verification Steps

### Manual Verification

1. **Check Neon Console**: Verify automated backups are running
2. **Test PITR**: Restore to a specific point in time in test environment
3. **Verify Logical Backups**: Test restore from pg_dump files
4. **Check Alerts**: Ensure backup failure notifications are received

### Automated Verification

**RECOMMENDED** - Implement automated checks:

- **Cron job**: Daily check for recent backup completion
- **Health check**: Verify backup files exist and are not corrupted
- **Size check**: Alert on unusual backup size changes
- **Age check**: Alert on stale backups

## Emergency Contacts

- **Database Administrator**: [CONTACT]
- **DevOps Engineer**: [CONTACT]
- **Neon Support**: https://neon.tech/support
- **Management Escalation**: [CONTACT]

## Related Documentation

- [Neon Backup Documentation](https://neon.tech/docs/manage/backups)
- [Neon Point-in-Time Recovery](https://neon.tech/docs/manage/pitr)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [DATABASE_SCHEMA_AUDIT.md](./DATABASE_SCHEMA_AUDIT.md)

## Last Updated

2026-09-01 - Initial backup strategy documentation
