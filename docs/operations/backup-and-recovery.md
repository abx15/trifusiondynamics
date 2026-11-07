# Backup and Recovery

Detailed operational references:

- [Database backup and recovery](../DATABASE_BACKUP_AND_RECOVERY.md)
- [Restore procedure](../RESTORE_PROCEDURE.md)
- [File backup and recovery](../FILE_BACKUP_AND_RECOVERY.md)
- [Object storage architecture](../OBJECT_STORAGE_ARCHITECTURE.md)

## Minimum operational expectations

1. Define recovery point objective (RPO) and recovery time objective (RTO) with the system owner.
2. Back up PostgreSQL using provider-supported snapshots/PITR or a tested dump process.
3. Back up uploaded objects separately from relational metadata.
4. Protect backups with encryption and restricted access.
5. Define retention and deletion schedules.
6. Monitor backup job success and storage capacity.
7. Test restore into an isolated environment on a regular schedule.
8. Document who can approve and perform production recovery.

A backup is not considered reliable until a restore has been tested. Never store backup archives or production database dumps in this public repository.
