# File Backup and Recovery

## Executive Summary

**Status**: NOT CONFIGURED (URL-only storage, no object storage)

AgencyOS currently has no object storage infrastructure, so file backup/recovery is not applicable. Database backups are configured and documented separately in `DATABASE_BACKUP_AND_RECOVERY.md`. This document outlines the backup strategy for when object storage is implemented.

**Current protection**: Download authorization endpoint (`GET /hr/employees/:employeeId/documents/:documentId/download`) enforces per-request org/ownership checks. `fileUrl` is stripped from employee profile API responses — only accessible through the authorized endpoint.

## Current State

### Database Backups

**VERIFIED**: PostgreSQL backups are configured:
- Neon automatic backups (documented in `DATABASE_BACKUP_AND_RECOVERY.md`)
- Point-in-time recovery available
- Backup retention: 7 days (default)

### Object Storage Backups

**NOT CONFIGURED**: No object storage exists, so no file backups.

## Backup Strategy

### Recommended Approach

**VERIFIED**: When object storage is implemented, use a multi-layered backup strategy:

### Layer 1: Provider-Level Backups

**Cloudflare R2**:
- Enable object versioning
- Configure automatic retention
- Cross-region replication (optional)

**AWS S3**:
- Enable S3 Versioning
- Configure S3 Cross-Region Replication (CRR)
- Use S3 Glacier for long-term archival

### Layer 2: Application-Level Backups

**Backup Bucket**:
- Separate bucket for critical documents
- Scheduled replication to backup bucket
- Different retention policies

**Metadata Backup**:
- Database includes file metadata
- Separate metadata export (JSON/CSV)
- Include checksums and storage keys

### Layer 3: Offsite Backups

**External Storage**:
- Replicate to different provider
- Geographic separation
- Air-gapped for critical data

## Backup Configuration

### Cloudflare R2 Setup

**VERIFIED**: Recommended configuration:

```bash
# Enable versioning on bucket
wrangler r2 bucket enable-versioning agency-os-files

# Configure lifecycle rules
wrangler r2 bucket put agency-os-files \
  --lifecycle-rules='[
    {
      "id": "delete-old-versions",
      "status": "enabled",
      "filter": {"prefix": "versions/"},
      "expiration": {"days": 90}
    }
  ]'
```

### AWS S3 Setup

**ALTERNATIVE**: If using AWS S3:

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket agency-os-files \
  --versioning-configuration Status=Enabled

# Enable cross-region replication
aws s3api put-bucket-replication \
  --bucket agency-os-files \
  --replication-configuration file://replication-config.json
```

## Retention Policies

### Document Type Retention

**VERIFIED**: Recommended retention by document type:

| Document Type | Primary Retention | Backup Retention | Archive Retention |
|---------------|-------------------|------------------|-------------------|
| Payslips | 7 years | 10 years | Permanent |
| Employee Documents | 7 years post-employment | 10 years | Permanent |
| Invoices | 7 years | 10 years | Permanent |
| Recruitment Resumes | 2 years | 5 years | 7 years |
| Temporary Files | 24 hours | 7 days | 30 days |
| Cache Files | 7 days | 30 days | 90 days |

### Version Retention

**RECOMMENDED**:
- Active versions: Keep all
- Previous versions: 90 days
- Deleted versions: 30 days (soft delete)
- Archive versions: 7 years

## Backup Schedule

### Automated Backups

**RECOMMENDED**:

**Daily**:
- Metadata export (JSON)
- Checksum verification
- Backup health check

**Weekly**:
- Cross-region replication sync
- Backup integrity verification
- Storage usage report

**Monthly**:
- Full backup verification
- Disaster recovery test
- Retention policy review

### Manual Backups

**BEFORE MAJOR CHANGES**:
- Full bucket snapshot
- Metadata export
- Pre-change state documentation

## Recovery Procedures

### Single File Recovery

**SCENARIO**: User accidentally deleted a document

**STEPS**:
1. Check object versioning for previous version
2. Restore from version history
3. Verify checksum integrity
4. Update database metadata
5. Log recovery event

**COMMANDS** (R2):
```bash
# List versions
wrangler r2 object list agency-os-files --prefix=documents/{fileId}

# Restore specific version
wrangler r2 object get agency-os-files/documents/{fileId} --version={versionId}
```

### Bulk Recovery

**SCENARIO**: Mass deletion or corruption

**STEPS**:
1. Identify affected time range
2. Restore from backup bucket
3. Verify integrity with checksums
4. Update database metadata
5. Validate access controls
6. Notify affected users

### Disaster Recovery

**SCENARIO**: Complete storage failure

**STEPS**:
1. Activate disaster recovery plan
2. Restore from offsite backup
3. Verify all data integrity
4. Update DNS/endpoint configuration
5. Test all functionality
6. Monitor for issues
7. Post-incident review

## Backup Verification

### Integrity Checks

**RECOMMENDED**:

**Daily**:
- Sample file verification (checksums)
- Backup availability check
- Storage quota monitoring

**Weekly**:
- Full metadata reconciliation
- Version consistency check
- Access control validation

**Monthly**:
- Full backup restoration test
- Disaster recovery drill
- Performance benchmarking

### Automated Monitoring

**ALERTS**:
- Backup failure
- Storage quota exceeded
- Integrity check failure
- Unusual deletion patterns
- Access anomalies

## Restore Testing

### Test Schedule

**RECOMMENDED**:

**Monthly**:
- Random file restore test
- Metadata consistency check
- Access control verification

**Quarterly**:
- Bulk restore test (100 files)
- Cross-region sync verification
- Performance test

**Annually**:
- Full disaster recovery drill
- Complete restore validation
- Documentation update

### Test Scenarios

**Scenario 1**: Single file restore
- Select random file
- Delete from primary
- Restore from backup
- Verify integrity
- Measure time

**Scenario 2**: Bulk restore
- Select 100 random files
- Delete from primary
- Restore from backup
- Verify all integrity
- Measure time

**Scenario 3**: Disaster recovery
- Simulate primary failure
- Activate backup
- Restore all data
- Verify functionality
- Measure RTO/RPO

## RTO and RPO

### Recovery Time Objective (RTO)

**TARGETS**:
- Single file: 5 minutes
- Bulk restore (100 files): 30 minutes
- Disaster recovery: 4 hours

### Recovery Point Objective (RPO)

**TARGETS**:
- Critical documents: 1 hour
- Standard documents: 24 hours
- Non-critical files: 7 days

## Cost Analysis

### Backup Costs

**Cloudflare R2**:
- Storage: $0.015/GB/month
- Versioning: Same as storage
- No egress fees

**AWS S3**:
- Storage: $0.023/GB/month
- Versioning: Same as storage
- Egress: $0.09/GB
- Cross-region replication: Additional storage + egress

### Cost Optimization

**RECOMMENDED**:
- Use lifecycle rules to expire old versions
- Archive infrequently accessed data
- Use cheaper storage tiers (Glacier)
- Monitor and optimize retention policies

## Security Considerations

### Backup Encryption

**RECOMMENDED**:
- At-rest encryption (provider default)
- In-transit encryption (HTTPS)
- Optional client-side encryption for sensitive data

### Access Control

**VERIFIED**:
- Separate backup bucket with restricted access
- Role-based access control
- Audit logging for backup operations
- MFA for critical operations

### Compliance

**RECOMMENDED**:
- GDPR: Data retention and right to deletion
- SOC 2: Backup verification and testing
- ISO 27001: Backup policies and procedures

## Monitoring and Alerting

### Metrics to Track

**Backup Health**:
- Backup success rate
- Backup duration
- Storage usage
- Integrity check results

**Recovery Performance**:
- Restore success rate
- Restore duration
- Data integrity
- RTO/RPO compliance

### Alert Configuration

**CRITICAL ALERTS**:
- Backup failure
- Integrity check failure
- Storage quota exceeded
- Unusual deletion patterns

**WARNING ALERTS**:
- Backup duration increased
- Storage usage trending high
- Recovery test failure

## Documentation

### Runbook

**REQUIRED**: Document and maintain:
- Backup procedures
- Recovery procedures
- Contact information
- Escalation paths
- Decision trees

### Change Management

**REQUIRED**: Track and document:
- Backup configuration changes
- Retention policy changes
- Recovery procedure updates
- Test results and lessons learned

## Integration with Database Backups

### Consistency Strategy

**RECOMMENDED**: Ensure consistency between database and object storage:

**Option 1**: Transactional consistency
- Database transaction includes storage operation
- Rollback both on failure
- Use application-level transactions

**Option 2**: Eventual consistency
- Database updated first
- Storage operation async
- Reconciliation job for consistency

**Option 3**: Separate consistency
- Database and storage independent
- Reconciliation via metadata
- Accept eventual consistency

### Verification

**RECOMMENDED**: Regular consistency checks:
```sql
-- Find database records without storage objects
-- (Only applicable when object storage is implemented — currently URL-only)
SELECT id, fileUrl FROM hr.EmployeeDocument
WHERE fileUrl IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM object_storage
    WHERE key = extract_storage_key(fileUrl)
  );

-- Find storage objects without database records
SELECT key FROM object_storage
WHERE key NOT IN (
  SELECT extract_storage_key(fileUrl) FROM hr.EmployeeDocument
  WHERE fileUrl IS NOT NULL
);
```

### Current State — URL-Only Storage

**VERIFIED**: No consistency risk exists because:
- No object storage is in use
- Only URL strings (external references) are stored in the database
- Database backups (Neon) include all URL metadata
- No local files to lose
- Download authorization is enforced at the application layer (`GET /hr/employees/:employeeId/documents/:documentId/download`)

## Summary

**Current Status**: NOT CONFIGURED (no object storage)
**Database Backups**: VERIFIED (documented separately)
**Recommended Provider**: Cloudflare R2
**Critical Path**: Implement object storage before backup strategy
**Priority**: P1 (critical for business continuity)

**Next Steps**:
1. Implement object storage
2. Enable versioning
3. Configure lifecycle rules
4. Set up backup bucket
5. Implement monitoring
6. Document procedures
7. Test recovery
8. Review and optimize

**Key Principles**:
- Defense in depth (multiple backup layers)
- Automation (reduce human error)
- Verification (ensure backups work)
- Testing (validate recovery procedures)
- Documentation (maintain runbooks)
