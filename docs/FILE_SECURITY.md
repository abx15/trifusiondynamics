# File Security

## Executive Summary

**Status**: SECURED (URL-only storage with hardened authorization)

AgencyOS has implemented URL validation, defense-in-depth URL sanitization, download authorization endpoints, and multi-tenant authorization for file metadata. The application uses URL-only storage where external URLs are stored in database fields and accessed only through authorized endpoints. Object storage (Cloudflare R2 recommended) must be implemented before actual file upload handling in production.

## Security Risks

### P0 Risks (Critical)

**RESOLVED**: Direct URL Exposure
- **Issue**: Frontend at `apps/admin-dashboard/app/hr/employees/[id]/page.tsx:165` directly rendered `<a href={doc.fileUrl}>View</a>`, bypassing per-request authorization. The `fileUrl` was also returned in the `GET /hr/employees/:id` API response, making it available to any client that could read the employee profile.
- **Impact**: Any URL stored in the database (including URLs pointing to sensitive third-party resources) was directly accessible from the frontend without re-checking authorization at fetch time.
- **Fix Applied (VERIFIED)**:
  1. Added `GET /hr/employees/:employeeId/documents/:documentId/download` endpoint with per-request authorization (org + ownership check)
  2. Stripped `fileUrl` from `GET /hr/employees/:id` response (Prisma `select` in service layer)
  3. Updated frontend to call download endpoint via `useDownloadDocument` hook instead of using `doc.fileUrl` directly
  4. Added audit logging: all authorized downloads and unauthorized attempts are logged
  5. Added rate limiting: 30 downloads per minute per user
- **Status**: ✅ FIXED

### P1 Risks (High)

**FIXED**: URL Validation
- **Issue**: No validation on URL strings stored in database
- **Impact**: Potential XSS via `javascript:` or `data:` URLs
- **Fix**: Added `@IsUrl()` validation with protocol restrictions (http/https only), `@MaxLength(2048)`, and `@Matches` regex for path traversal/null byte/sensitive path rejection
- **Status**: ✅ FIXED

**FIXED**: Path Traversal & Null Byte Injection
- **Issue**: `@IsUrl` alone does not reject path traversal sequences (`../`) or null byte encoding (`%00`) within otherwise-valid URLs
- **Impact**: URLs with path traversal or encoded null bytes could be stored and potentially used to access unintended resources
- **Fix**: Added `@Matches(/^((?!%00|\.\.[\\/]|\/etc\/passwd|\/\.env).)*$/)` to `fileUrl` and `resumeUrl` DTO fields
- **Status**: ✅ FIXED

### P2 Risks (Medium)

**NOT CONFIGURED**: File Upload Security
- **Issue**: No file upload infrastructure exists
- **Impact**: N/A (no uploads yet)
- **Fix Required**: Implement when object storage is added
- **Status**: ⏳ DEFERRED

**NOT CONFIGURED**: Signed URL Expiration
- **Issue**: No signed URL mechanism exists
- **Impact**: When object storage is added, URLs could be shared indefinitely
- **Fix Required**: The download endpoint architecture is in place — just needs presigned URL generation
- **Status**: ⏳ DEFERRED

### P3 Risks (Low)

**NOT CONFIGURED**: File Type Validation
- **Issue**: No file type validation exists
- **Impact**: N/A (no uploads yet)
- **Fix Required**: Implement allowlist with magic byte validation when uploads are added
- **Status**: ⏳ DEFERRED

**NOT CONFIGURED**: Malware Scanning
- **Issue**: No malware scanning capability
- **Impact**: N/A (no uploads yet)
- **Fix Required**: Implement ClamAV or cloud scanning when uploads are added
- **Status**: ⏳ DEFERRED

## Security Controls

### Implemented Controls

**VERIFIED**:

1. **Multi-Tenant Authorization**
   - Organization-scoped document access (JWT `orgId` validated against employee `organizationId`)
   - Permission-based access control (`hr:read`, `hr:write`)
   - Self-access for employees viewing own documents (`user.sub === employee.userId`)
   - Organization validation on all document operations
   - Location: `employees.controller.ts:106-120, 130-153, 158-184, 186-228`

2. **URL Validation (Defense in Depth)**
   - Protocol restriction (http/https only) via `@IsUrl({ protocols: ['https', 'http'], require_protocol: true })`
   - URL length restriction (max 2048 chars) via `@MaxLength(2048)`
   - Path traversal rejection (`../`, `..\`) via `@Matches` regex
   - Null byte rejection (`%00`) via `@Matches` regex
   - Sensitive file path rejection (`/etc/passwd`, `/.env`) via `@Matches` regex
   - Script tag rejection (`<script>`) via `@IsUrl`
   - Location: `create-document.dto.ts`, `update-document.dto.ts`, `create-candidate.dto.ts`

3. **Download Authorization**
   - Per-request authorization on every document access
   - JWT authentication required
   - Organization membership validated
   - Self-access or `hr:read` permission required
   - Rate limited (30 req/min per user)
   - Audit logged
   - Location: `employees.controller.ts:186-228`

4. **fileUrl Protection**
   - `fileUrl` stripped from `GET /hr/employees/:id` response
   - Only accessible through authorized download endpoint
   - Location: `employees.service.ts:findOne()`, `employees.service.ts:findByUserId()`

5. **Cascade Delete Protection**
   - Database records cascade with employee deletion
   - Prevents orphan metadata
   - Location: `schema.prisma:EmployeeDocument` (`onDelete: Cascade`)

6. **Input Validation**
   - Class-validator decorators on all DTOs
   - Type safety with TypeScript
   - Length restrictions on string fields

7. **Rate Limiting**
   - Redis-backed distributed throttling (`RedisThrottlerStorage`)
   - 30 req/min on download endpoint
   - 100 req/min default for all other endpoints
   - Graceful fallback to in-memory when Redis unavailable
   - Location: `app.module.ts:39-49`, `employees.controller.ts:187`

8. **Audit Logging**
   - Authorized downloads logged with user ID, document ID, type, organization
   - Unauthorized attempts logged with same context
   - Uses pino logger (nestjs-pino)
   - Location: `employees.controller.ts:204-221`

### Missing Controls

**NOT CONFIGURED** (required when file uploads are implemented):

1. **File Upload Validation**
   - MIME type verification (magic bytes)
   - File extension validation
   - Maximum file size enforcement
   - Filename sanitization

2. **Access Control Enforcement**
   - Presigned URL generation (download endpoint is ready for this)
   - URL expiration (planned — 15 min TTL for downloads)
   - Per-document permissions
   - Download authorization (currently implemented for URL-only storage)

3. **Encryption**
   - At-rest encryption (depends on provider — R2 managed)
   - In-transit encryption (HTTPS required via Nginx/Cloudflare)
   - Client-side encryption (optional)

## Multi-Tenant Security

### Tenant Isolation

**VERIFIED**: Current implementation provides:

1. **Organization Scope**
   - All documents linked to organization via employee
   - Cross-organization access prevented
   - Organization validation on all operations

2. **Employee Ownership**
   - Documents linked to specific employees
   - Self-access only for own documents
   - HR/admin access via permissions

3. **Authorization Flow**
   ```
   Request → JWT Validation → Permission Check → Organization Validation → Employee Verification → Access Granted
   ```

### IDOR Prevention

**FIXED**: Insecure Direct Object Reference vulnerabilities

**Vulnerability That Was Fixed**:
```tsx
// VULNERABLE: Direct URL exposure
<a href={doc.fileUrl} target="_blank">View</a>
```

**Security Fix Applied**:
```tsx
// SECURE: Server-side authorization via download endpoint
<button
  onClick={() => {
    downloadDocument.mutate(
      { employeeId: id, documentId: doc.id },
      {
        onSuccess: (data) => window.open(data.fileUrl, "_blank"),
        onError: () => toast.error("Unable to open document."),
      },
    );
  }}
>
  View
</button>
```

With the backend:
```typescript
// SECURE: Per-request authorization
@Get(':employeeId/documents/:documentId/download')
@Throttle({ default: { limit: 30, ttl: 60000 } })
async downloadDocument(...) {
  // 1. Verify employee belongs to organization
  // 2. Check self-access OR hr:read permission
  // 3. Verify document belongs to employee
  // 4. Log access
  // 5. Return fileUrl
}
```

## Data Classification

### Document Types

**HIGHLY SENSITIVE**:
- Payslips (financial data)
- Bank details (financial information)
- Identity documents (personal data)

**SENSITIVE**:
- Employee contracts (legal documents)
- Performance reviews (HR data)
- Medical records (health data)

**MODERATELY SENSITIVE**:
- Resumes (personal information)
- Offer letters (employment data)
- Certificates (professional data)

**PUBLIC**:
- None currently

### Security Requirements by Classification

**HIGHLY SENSITIVE**:
- Private storage only ✅ (URL-only, no public files)
- Strict authorization ✅ (org + ownership + hr:read)
- Audit logging ✅ (download access logged)
- Short-lived access URLs ⏳ (will be 15 min when presigned URLs implemented)
- Encryption at rest ⏳ (provider-managed when R2 added)
- Encryption in transit ✅ (HTTPS via Nginx + Cloudflare)

**SENSITIVE**:
- Private storage only ✅
- Authorization required ✅
- Audit logging recommended ✅ (implemented)
- Access URLs (1 hour) ⏳ (planned for presigned URLs)
- Encryption in transit ✅

**MODERATELY SENSITIVE**:
- Private storage ✅
- Authorization required ✅
- Optional audit logging ✅ (implemented for all documents)
- Encryption in transit ✅

## Attack Vectors

### Prevented Attacks

**MITIGATED**:

1. **Path Traversal**
   - URL validation with `@IsUrl` + `@Matches` regex
   - Rejects `../`, `..\` sequences in URLs
   - Rejects `file://`, `ftp://` protocols

2. **XSS via File URLs**
   - Protocol restriction (http/https only)
   - URL validation via `@IsUrl`
   - Script tag rejection
   - No `javascript:` or `data:` URLs

3. **IDOR (Insecure Direct Object Reference)**
   - Organization validation on all document operations
   - Employee ownership verification
   - Permission checks (hr:read, hr:write)
   - fileUrl stripped from list responses
   - Download endpoint with per-request authorization

4. **Unauthorized Access**
   - JWT authentication (HttpOnly cookies)
   - Permission guards (PermissionsGuard)
   - Multi-tenant isolation (org-scoped queries)
   - Self-access restrictions (employee can only view own docs)

5. **Null Byte Injection**
   - `@Matches` regex rejects `%00` in URLs

6. **Sensitive File Path Exposure**
   - `@Matches` regex rejects `/etc/passwd` and `/.env` patterns

### Potential Attacks (When Uploads Implemented)

**NOT YET MITIGATED**:

1. **Malicious File Upload**
   - File type validation needed
   - Magic byte verification
   - Malware scanning

2. **File Size DoS**
   - Size limits needed
   - Streaming for large files
   - Rate limiting ✅ (partially — 30 req/min on downloads)

3. **Filename Attacks**
   - Sanitization needed
   - Length restrictions
   - Special character filtering

## Compliance Considerations

### GDPR Requirements

**VERIFIED**: Current implementation addresses:
- Data minimization (only URLs stored, not files)
- Access control (organization-scoped, permission-based)
- Right to deletion (cascade delete with employee)

**NOT CONFIGURED** (needed for full compliance):
- Data processing records (audit logging — partially implemented for downloads)
- Data portability (export functionality)
- Breach notification (monitoring)

### Data Retention

**RECOMMENDED**: Retention policies by document type:
- Payslips: 7 years (legal requirement)
- Employee documents: 7 years after employment ends
- Recruitment resumes: 2 years (GDPR)
- Invoices: 7 years (tax requirement)

### Data Subject Rights

**IMPLEMENTED**:
- Right to access (employee can view own documents via download endpoint)
- Right to deletion (cascade delete with employee)

**NOT IMPLEMENTED**:
- Right to portability (bulk export)
- Right to rectification (document editing — PATCH endpoint exists)

## Security Best Practices

### Implemented

✅ **Defense in Depth**
- JWT authentication
- Permission-based authorization
- Organization validation
- Input validation (URL protocol, length, path traversal, null bytes)
- Rate limiting
- Audit logging
- fileUrl stripped from list responses

✅ **Principle of Least Privilege**
- Role-based access control
- Permission-based endpoints
- Self-access restrictions
- Minimal data in API responses (fileUrl excluded from list)

✅ **Secure by Default**
- Private storage model (URL-only, no public files)
- Authorization required for all document access
- Per-request authorization on download endpoint

✅ **Secure by Design**
- Download endpoint validates on every request (not just at creation)
- URL validation at DTO layer (prevents XSS, SSRF, path traversal)
- fileUrl only accessible through authorized endpoint
- Rate limiting prevents abuse

## Monitoring and Alerting

### Current State

**PARTIALLY CONFIGURED**: Download authorization events are logged via pino:
- Authorized downloads: logs user, document ID, type, organization
- Unauthorized attempts: logs user, document ID, organization
- Uses pino logger with request ID tracing

### Recommended Monitoring

**CRITICAL ALERTS**:
- Unauthorized file access attempts
- Abnormal access patterns
- Rate limit violations

**INFORMATIONAL LOGS**:
- File access (user, document ID, timestamp)
- Access denied (user, document ID, reason)

### Metrics to Track

**Security Metrics**:
- Failed access attempts
- Rate limit violations
- Unusual access patterns

**Operational Metrics**:
- Download frequency
- Error rates
- User activity patterns

## Incident Response

### Current State

**NOT CONFIGURED**: No incident response plan for file security specifically. General API logging exists via `ApiLoggingInterceptor`.

### Recommended Procedures

**Unauthorized Access Incident**:
1. Review audit logs for the affected document ID
2. Identify unauthorized access patterns
3. Revoke access tokens if needed
4. Notify affected parties
5. Implement additional controls

## Security Testing

### Current State

**VERIFIED**: File security tests cover:
- URL validation (javascript:, data:, file://, ftp://, path traversal, null bytes)
- Protocol restrictions (http/https only)
- Length validation (max 2048 chars)
- Download authorization (self-access, HR access, cross-org, non-HR user)

### Test Files

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `create-document.dto.spec.ts` | 15 | URL validation, path traversal, null bytes, XSS, length |
| `create-candidate.dto.spec.ts` | 7 | URL validation for resume URLs |
| `employees.controller.spec.ts` | 6 | Download authorization, IDOR prevention |

## Compliance Checklist

### GDPR
- [x] Data minimization
- [x] Access control
- [x] Right to deletion
- [ ] Audit logging (partially implemented — downloads logged, not uploads)
- [ ] Data portability
- [ ] Breach notification
- [ ] DPIA (for high-risk processing)

### SOC 2
- [x] Access control
- [x] Data encryption (in transit — HTTPS)
- [ ] Change management
- [ ] Incident response
- [ ] Monitoring
- [ ] Vulnerability management

### ISO 27001
- [x] Access control
- [x] Data classification
- [ ] Asset management
- [ ] Cryptography
- [ ] Physical security
- [ ] Operations security

## Summary

**Security Status**: SECURED (URL-only storage)
**Critical Vulnerabilities**: RESOLVED
**Production Readiness**: NOT READY (requires object storage for actual file uploads)
**Risk Level**: LOW (URL-only approach has minimal attack surface, authorization enforced)

**Key Achievements**:
- ✅ Fixed direct URL exposure vulnerability (IDOR)
- ✅ Added URL validation with path traversal/null byte rejection
- ✅ Implemented per-request download authorization
- ✅ Stripped fileUrl from list API responses
- ✅ Added rate limiting on download endpoint
- ✅ Added audit logging for document access
- ✅ Added comprehensive security tests
- ✅ Multi-tenant authorization on all document operations

**Remaining Work**:
- ⏳ Implement object storage (Cloudflare R2 recommended)
- ⏳ Add file upload validation (MIME, magic bytes, size limits)
- ⏳ Implement presigned URLs with TTL
- ⏳ Add malware scanning (ClamAV)
- ⏳ Configure at-rest encryption
- ⏳ Implement backup/replication for object storage
- ⏳ Add orphan file detection
- ⏳ Implement async processing for large files
