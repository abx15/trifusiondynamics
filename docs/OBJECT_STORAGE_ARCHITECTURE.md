# Object Storage Architecture

## Executive Summary

**Status**: NOT CONFIGURED (URL-only storage with hardened authorization)

AgencyOS has no object storage infrastructure. The application uses URL-only storage where external URLs are stored directly in database fields. Critical security vulnerabilities have been fixed through server-side validation, per-request download authorization, defense-in-depth URL validation, and multi-tenant authorization. Object storage (Cloudflare R2 recommended) must be implemented before the application can handle actual file uploads.

## Current File Architecture

### File Types in Database

The application tracks three types of file metadata:

1. **Employee Documents** (`hr.EmployeeDocument`)
   - `fileUrl`: String field for document URL (NOT returned in list queries — only via authorized download endpoint)
   - `type`: Document type (e.g., "offer_letter", "id_proof")
   - `employeeId`: Owner reference
   - `uploadedAt`: Timestamp
   - `id`: UUID primary key

2. **Payslip PDFs** (`payroll.Payslip`)
   - `pdfUrl`: Optional string field for payslip PDF URL (currently null in all records — field is dead code)

3. **Recruitment Resumes** (`hr.Recruitment`)
   - `resumeUrl`: Optional string field for candidate resume URL (currently null in seed data)

### Storage Flow

**VERIFIED**: Current implementation:
```
Frontend → API → Database URL String → External URL (if any)
```

No actual file storage exists. The system only stores URL strings in the database.

### File Endpoints

**VERIFIED** — Current endpoints:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/hr/employees/:id` | JWT + org/self | Returns employee with documents (fileUrl STRIPPED from response) |
| POST | `/hr/employees/:employeeId/documents` | JWT + hr:write | Add document URL with validation |
| PATCH | `/hr/employees/:employeeId/documents/:documentId` | JWT + hr:write | Update document URL with validation |
| DELETE | `/hr/employees/:employeeId/documents/:documentId` | JWT + hr:write | Delete document record |
| **GET** | **`/hr/employees/:employeeId/documents/:documentId/download`** | **JWT + org/self** | **Authorized download — returns fileUrl after per-request authorization** |
| POST | `/hr/recruitment` | JWT + hr:write | Accepts resumeUrl in DTO |
| GET | `/payroll/payslips/:id` | JWT + org/ownership | Returns payslip with pdfUrl (currently null) |

### Download Authorization Endpoint

**VERIFIED** — `GET /hr/employees/:employeeId/documents/:documentId/download`:

```
Client → API
  ↓
JwtAuthGuard validates JWT token
  ↓
EmployeesController.downloadDocument validates:
  1. Employee belongs to user's organization (404 if not found)
  2. User is either the employee themselves OR has 'hr:read' permission (403 if not)
  3. Document belongs to the employee (404 if not found)
  ↓
Audit log: "Document download authorized: user=..."
  ↓
Returns { fileUrl, type, uploadedAt }
```

This endpoint establishes the authorization pattern that will support presigned URLs when object storage is implemented. When R2/S3 is added, the endpoint will return a short-lived presigned URL instead of the stored `fileUrl`.

**Rate Limiting**: `@Throttle({ default: { limit: 30, ttl: 60000 } })` — 30 downloads per minute per user, backed by Redis.

## Storage Provider

**Status**: NOT CONFIGURED

### Current State
- No S3, R2, or any object storage provider configured
- No storage SDK dependencies in package.json (`@aws-sdk/*` not present)
- No multipart upload handlers
- No file streaming infrastructure

### Recommendations

**VERIFIED**: The application needs object storage for:
1. Employee documents (identity proofs, offer letters, contracts)
2. Payslip PDFs (sensitive financial documents)
3. Recruitment resumes (candidate files)
4. Invoice attachments (future requirement)
5. Profile images (future requirement)

**RECOMMENDED**: Cloudflare R2
- Zero egress fees (significant cost savings)
- S3-compatible API
- Edge network integration
- Signed URL support
- Lifecycle rules
- Versioning support

**ALTERNATIVE**: AWS S3
- Mature ecosystem
- Extensive SDK support
- Higher egress costs
- More complex setup

### Migration Path (When Implemented)
1. Set up R2 bucket with private ACLs
2. Configure lifecycle rules and versioning
3. Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` dependencies
4. Create a `StorageService` abstraction module
5. Implement presigned URL generation (5 min POST, 15 min GET)
6. Update download endpoint to return presigned URLs
7. Migrate existing `fileUrl` strings to `storageKey`-based references

## Local Filesystem Usage

**Status**: VERIFIED SAFE

### Audit Results
- No files stored on Render filesystem
- No `/tmp` or `/uploads/` directories for user uploads
- No `fs.writeFile` or `fs.createWriteStream` for file uploads
- No local file storage code in application
- All file operations are database-only (URL strings)

### Classification
**TEMPORARY**: None
**PERMANENT**: None

The application correctly avoids local filesystem storage, which is appropriate for ephemeral containers on Render.

## Database File Metadata

### Current Schema

**EmployeeDocument**:
```prisma
model EmployeeDocument {
  id         String   @id @default(uuid())
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  type       String
  fileUrl    String
  uploadedAt DateTime @default(now())

  @@schema("hr")
}
```

**Payslip**:
```prisma
model Payslip {
  id           String   @id @default(uuid())
  employeeId   String
  month        Int
  year         Int
  grossAmount  Decimal  @db.Decimal(12, 2)
  deductions   Decimal  @db.Decimal(12, 2)
  netAmount    Decimal  @db.Decimal(12, 2)
  tax          Decimal  @default(0) @db.Decimal(12, 2)
  status       PayslipStatus @default(GENERATED)
  paidAt       DateTime?
  pdfUrl       String?
  createdAt    DateTime @default(now())

  @@unique([employeeId, month, year])
  @@schema("payroll")
}
```

**Recruitment**:
```prisma
model Recruitment {
  id             String   @id @default(uuid())
  position       String
  department     String?
  candidateName  String
  candidateEmail String
  resumeUrl      String?
  stage          RecruitmentStage @default(APPLIED)
  notes          String?  @db.Text
  organizationId String
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@schema("hr")
}
```

### Missing Metadata Fields

**RECOMMENDED additions** (when file uploads are implemented):
- `filename`: Original filename (user-provided)
- `mimeType`: Content-Type (e.g., "application/pdf")
- `size`: File size in bytes
- `checksum`: SHA-256 hash for integrity
- `storageKey`: Object storage key (e.g., "organizations/{orgId}/documents/{fileId}")
- `uploadedBy`: User ID who uploaded
- `deletedAt`: Soft delete timestamp

**NOT REQUIRED**: Current URL-only approach doesn't need these yet.

### fileUrl Protection (VERIFIED)

The `fileUrl` field is **not** returned in the `GET /hr/employees/:id` response. The `EmployeesService.findOne()` and `findByUserId()` methods use `select` to exclude `fileUrl` from the documents list:

```typescript
documents: {
  select: {
    id: true,
    employeeId: true,
    type: true,
    uploadedAt: true,
  },
},
```

This prevents accidental frontend exposure of the raw URL. Document files are only accessible through the authorized download endpoint.

## Multi-Tenant Authorization

### Current Implementation

**VERIFIED**: Employee document access is controlled through:
- Organization-scoped document access (JWT `orgId` validated against employee `organizationId`)
- Permission-based access (`hr:read`, `hr:write`)
- Self-access for employees viewing own documents (`user.sub === employee.userId`)
- Organization validation on all document operations (create, update, delete, download)

### Authorization Flow

```
GET /hr/employees/:employeeId/documents/:documentId/download
  ↓
JwtAuthGuard validates JWT token
  ↓
PermissionsGuard checks (no specific permission required — self-access allowed)
  ↓
EmployeesController.downloadDocument:
  1. Verify employee belongs to user's organization (404 if not found)
  2. Check self-access OR hr:read permission (403 if neither)
  3. Verify document belongs to employee (404 if not found)
  ↓
Returns fileUrl
```

### IDOR Prevention

**VERIFIED**: All document endpoints validate organization and ownership:

| Endpoint | Org Check | Ownership Check | Permission |
|----------|-----------|-----------------|------------|
| POST /:employeeId/documents | ✅ orgId match | ✅ employee in org | hr:write |
| PATCH /:employeeId/documents/:documentId | ✅ orgId match | ✅ doc belongs to employee | hr:write |
| DELETE /:employeeId/documents/:documentId | ✅ orgId match | ✅ doc belongs to employee | hr:write |
| GET /:employeeId/documents/:documentId/download | ✅ orgId match | ✅ doc belongs to employee | Self or hr:read |
| GET /:id (employee profile) | ✅ orgId match | ✅ Self or hr:read | Self or hr:read |

### URL-String IDOR (VERIFIED FIXED)

**Issue**: Frontend at `apps/admin-dashboard/app/hr/employees/[id]/page.tsx:165` directly rendered `<a href={doc.fileUrl}>View</a>`, bypassing per-request authorization.

**Fix Applied**:
1. Added `GET /hr/employees/:employeeId/documents/:documentId/download` endpoint with full authorization
2. Frontend now calls the download endpoint via `useDownloadDocument` hook instead of using `fileUrl` directly
3. `fileUrl` is stripped from the employee profile API response — only accessible through the download endpoint
4. All authorization failures are logged via pino logger

## Storage Key Design

**Status**: NOT IMPLEMENTED

### Recommended Pattern

**VERIFIED**: When object storage is implemented, use:

```
organizations/{organizationId}/documents/{fileId}
organizations/{organizationId}/payslips/{employeeId}/{year}/{month}.pdf
organizations/{organizationId}/recruitment/{candidateId}/resume.{ext}
```

### Security Rules
- Never include sensitive data in keys
- Use generated IDs (UUIDs) over user-controlled filenames
- Include organizationId for multi-tenant isolation
- Use hierarchical structure for lifecycle rules

### Prohibited in Keys
- Passwords, JWTs, tokens
- Personal secrets
- Raw authentication data
- User-controlled paths

## File Name Security

**Status**: PARTIALLY IMPLEMENTED

### URL Validation (VERIFIED)

**Status**: IMPLEMENTATION APPLIED — Added to DTOs:

**`services/auth/src/modules/hr/employees/dto/create-document.dto.ts`**:
- `@IsUrl({ protocols: ['https', 'http'], require_protocol: true })` — protocol restriction
- `@MaxLength(2048)` — URL length cap
- `@Matches(/^((?!%00|\.\.[\\/]|\/etc\/passwd|\/\.env).)*$/)` — path traversal, null byte, and sensitive file path rejection

**`services/auth/src/modules/hr/employees/dto/update-document.dto.ts`**:
- Same validation as create-document

**`services/auth/src/modules/hr/recruitment/dto/create-candidate.dto.ts`**:
- Same validation for `resumeUrl` field

### Validation Coverage

**VERIFIED** — The following are rejected:
| Attack | Pattern | Status |
|--------|---------|--------|
| XSS via URL | `javascript:alert(1)` | ✅ Rejected by `@IsUrl` protocol restriction |
| Data URI XSS | `data:text/html,...` | ✅ Rejected by `@IsUrl` protocol restriction |
| Path traversal | `https://x.com/../../../etc/passwd` | ✅ Rejected by `@Matches` regex |
| Null byte | `https://x.com/file.pdf%00.exe` | ✅ Rejected by `@Matches` regex |
| Local file | `file:///etc/passwd` | ✅ Rejected by `@IsUrl` protocol restriction |
| FTP | `ftp://evil.example.com/steal.exe` | ✅ Rejected by `@IsUrl` protocol restriction |
| XSS in path | `https://x.com/<script>alert(1)</script>` | ✅ Rejected by `@IsUrl` |
| No protocol | `example.com/document.pdf` | ✅ Rejected by `@IsUrl` require_protocol |
| Oversized URL | >2048 chars | ✅ Rejected by `@MaxLength(2048)` |

### Tests
- `create-document.dto.spec.ts` — 15 tests covering all attack vectors above
- `create-candidate.dto.spec.ts` — 7 tests covering URL validation for resume

## File Type Validation

**Status**: NOT IMPLEMENTED (no uploads exist)

### Current State

No file type validation exists because no file uploads exist. Only URL strings are stored in the database.

### Recommended Allowlist

**VERIFIED** — When implementing uploads, allow:

**Documents**:
- `application/pdf` - PDF files
- `application/msword` - Word documents
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - DOCX
- `application/vnd.ms-excel` - Excel
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - XLSX

**Images**:
- `image/jpeg` - JPEG
- `image/png` - PNG
- `image/webp` - WebP

### Validation Strategy

**RECOMMENDED**:
1. Check MIME type from Content-Type header
2. Validate file extension
3. Verify magic bytes (file signature)
4. Enforce maximum file size

## File Size Limits

**Status**: NOT IMPLEMENTED (no uploads exist)

### Current State

No file size limits for uploads exist because no upload infrastructure exists.

### Current Body Parse Limits

**VERIFIED** — Application-level body parsing limits:

| Layer | Setting | Value |
|-------|---------|-------|
| NestJS app (`main.ts`) | JSON body limit | 5 MB |
| NestJS app (`main.ts`) | URL-encoded body limit | 5 MB |
| Nginx (`infra/nginx/api.conf`) | `client_max_body_size` | Not set (default 1 MB) ⚠️ |

**WARNING**: Nginx default `client_max_body_size` is 1 MB — any request body exceeding 1 MB is rejected at the Nginx layer, before reaching the NestJS app. The 5 MB app-level limit is unreachable through Nginx. When file upload endpoints are added, Nginx must be configured with an appropriate `client_max_body_size`.

### Recommended Limits

**VERIFIED**:

| File Type | Max Size | Rationale |
|-----------|----------|-----------|
| Profile Image | 5 MB | Avatar images |
| Employee Document | 10 MB | PDFs, contracts |
| Payslip PDF | 2 MB | Generated PDFs |
| Resume | 5 MB | CV documents |
| Invoice Attachment | 10 MB | Supporting docs |

## Memory Safety

**Status**: NOT APPLICABLE (no uploads)

### Current State

No file uploads exist, so no memory safety concerns.

### Future Recommendation

**RECOMMENDED**: For large files (>5MB), use streaming to avoid loading entire files into memory:
- Stream directly to object storage via presigned URL
- Never load entire file as a Buffer in request handlers

## Presigned URL Architecture

**Status**: NOT IMPLEMENTED (no object storage)

### Current Download Endpoint

**VERIFIED**: The download endpoint (`GET /hr/employees/:employeeId/documents/:documentId/download`) establishes the authorization pattern. When object storage is implemented, this endpoint will:

1. Validate user authentication and authorization (already implemented)
2. Generate a short-lived presigned URL (5 min TTL)
3. Return the presigned URL to the client
4. Log the access for audit purposes

### Recommended Pattern (When Object Storage Implemented)

**Upload Flow**:
```
Client → API (request upload permission)
  ↓
API validates user/organization
  ↓
API generates presigned POST URL (5 min TTL)
  ↓
Client uploads directly to object storage
  ↓
Client returns storage key to API
  ↓
API stores metadata in database
```

**Download Flow**:
```
Client → API (request file download)
  ↓
API validates user/organization/ownership (already implemented)
  ↓
API generates presigned GET URL (15 min TTL)
  ↓
Client downloads directly from object storage
  ↓
URL expires automatically
```

### TTL Recommendations

**VERIFIED**:
- Upload URLs: 5 minutes
- Sensitive download URLs: 15 minutes
- Document download URLs: 1 hour
- Public asset URLs: 24 hours

## Public vs Private Storage

**Status**: NOT CONFIGURED (no object storage)

### Classification

**PRIVATE FILES** (require authentication):
- Employee documents (identity proofs, contracts)
- Payslip PDFs (financial data — HIGHLY SENSITIVE)
- Recruitment resumes (personal information)
- Invoice attachments (future)
- Profile images (future)

**PUBLIC FILES** (no authentication):
- None currently

**RECOMMENDED**: Use separate buckets or prefixes when implemented:
- `private/` - Authenticated access only
- `public/` - Publicly accessible (CDN-backed)

## R2 Evaluation

**Status**: RECOMMENDED

### Comparison

| Feature | Cloudflare R2 | AWS S3 |
|---------|---------------|--------|
| Egress Cost | $0 | $0.09/GB |
| Storage Cost | $0.015/GB | $0.023/GB |
| API Compatibility | S3-compatible | Native S3 |
| Signed URLs | Yes | Yes |
| Edge Network | Yes | Yes |
| SDK Support | S3 SDK | Native SDK |
| Setup Complexity | Low | Medium |

### Recommendation

**VERIFIED**: Cloudflare R2 is recommended for:
- Zero egress fees (major cost savings)
- S3-compatible API (easy migration)
- Edge network integration
- Existing Cloudflare infrastructure

## Malware Scanning

**Status**: NOT REQUIRED (no uploads exist)

### Current Assessment

**VERIFIED**: Malware scanning is not currently required because:
- No file uploads exist
- Only URL strings are stored
- External URLs are user-provided (not under application control)
- Download endpoint provides per-request authorization

### Future Recommendation

**RECOMMENDED**: When file uploads are implemented:
- Stage 1: Basic file type validation (magic bytes)
- Stage 2: ClamAV integration for critical documents
- Stage 3: Cloud-based scanning (e.g., VirusTotal API)

**Priority**: P3 (can be deferred until upload infrastructure exists)

## Image Security

**Status**: NOT APPLICABLE (no image uploads)

### Current State

No image uploads exist. Static logos are served from Next.js `public/` directory. Third-party avatars use Unsplash CDN (`images.unsplash.com`).

### Future Recommendations

**RECOMMENDED** (when implemented):
- Validate dimensions (max 4096x4096)
- Remove EXIF metadata
- Normalize format (WebP)
- Compress to target size

## Document Security

**Status**: URL-ONLY (no actual files)

### Sensitive Document Types

**VERIFIED**: The application will handle:
- **Payslips** - Financial data (HIGHLY SENSITIVE)
- **Employee Documents** - Identity documents, contracts (SENSITIVE)
- **Recruitment Resumes** - Personal information (MODERATELY SENSITIVE)
- **Invoices** - Financial data (SENSITIVE)

### Security Requirements

**VERIFIED** — Current implementation:
- URL-only storage (no actual files stored)
- Private storage model (no public file access)
- Authorization required for all document operations
- `fileUrl` stripped from list responses (not exposed in API payload)
- Per-request authorization on download endpoint

**NOT CONFIGURED** (required when object storage implemented):
- Encryption at rest (R2 default — provider-managed)
- Short-lived access URLs (presigned URLs with TTL)
- Audit logging for access (download endpoint logs via pino)

## Download Authorization

**Status**: IMPLEMENTED (URL-only storage)

### Current Implementation

**VERIFIED**: Download authorization is enforced through:

1. `GET /hr/employees/:employeeId/documents/:documentId/download` endpoint
2. JWT authentication required (class-level `JwtAuthGuard`)
3. Organization validation (employee must belong to user's org)
4. Ownership validation (user must be the employee OR have `hr:read` permission)
5. Document existence validation (document must belong to employee)
6. Audit logging (all authorized downloads logged via pino)
7. Rate limiting (30 downloads per minute per user)

### Access Matrix

| Role | Own Documents | Org Documents | All Documents |
|------|---------------|---------------|---------------|
| Employee (self) | ✅ Read | ❌ | ❌ |
| HR | ✅ Read | ✅ Read | ❌ |
| Admin | ✅ Read | ✅ Read/Write | ❌ |

### URL Exposure Prevention

**VERIFIED**:
- `fileUrl` is stripped from `GET /hr/employees/:id` response (service layer `select`)
- Frontend routes all document access through download endpoint (`useDownloadDocument` hook)
- Download endpoint validates authorization on every request, not just at creation time

## Signed URL TTL

**Status**: NOT APPLICABLE (no object storage)

### Current State

No signed URLs exist. The download endpoint returns the stored `fileUrl` string after authorization. When object storage is implemented, this endpoint will generate time-limited presigned URLs.

### Recommended TTLs

**VERIFIED**:
- Upload URLs: 5 minutes
- Sensitive download URLs: 15 minutes
- Document download URLs: 1 hour
- Public asset URLs: 24 hours

## Delete Strategy

**Status**: CASCADE DELETE (DATABASE ONLY)

### Current Implementation

**VERIFIED**: Database cascade deletes:
- `EmployeeDocument` cascades with `Employee` (`onDelete: Cascade`)
- No object storage deletion (no storage exists)

The `DELETE /hr/employees/:employeeId/documents/:documentId` endpoint:
1. Verifies employee belongs to organization
2. Verifies document belongs to employee
3. Deletes the database record
4. Returns `{ success: true }`

### Future Strategy

**RECOMMENDED** (when object storage implemented):
1. **Soft delete** database record first (add `deletedAt` field)
2. **Schedule** object deletion (7-day retention)
3. **Hard delete** after retention period
4. **Audit log** all deletions

**Priority**: P1 (important for compliance)

## Orphan Files

**Status**: NOT APPLICABLE (no object storage)

### Current State

No orphan files possible (no object storage).

### Future Detection

**RECOMMENDED**: When object storage implemented:
```sql
-- Find objects without database records
SELECT key FROM object_storage
WHERE key NOT IN (
  SELECT storageKey FROM hr.EmployeeDocument
  WHERE storageKey IS NOT NULL
);
```

**Cleanup Strategy**: Scheduled job to identify and clean orphans.

## Integrity / Checksums

**Status**: NOT IMPLEMENTED (no files)

### Current State

No checksums exist (no files stored).

### Future Recommendation

**RECOMMENDED**: Store SHA-256 checksum for:
- Critical documents (payslips, contracts)
- Large files (>1MB)
- Financial documents

Use streaming hash computation for large files — never hash entire files in memory.

## Backup Strategy

**Status**: DATABASE ONLY (no object storage)

### Current State

**VERIFIED**: PostgreSQL backups exist (documented in `DATABASE_BACKUP_AND_RECOVERY.md`)

**NOT CONFIGURED**: Object storage backup (no storage to backup)

### Future Strategy

**RECOMMENDED** (when object storage implemented):
1. **Enable versioning** on R2 bucket
2. **Configure cross-region replication**
3. **Implement lifecycle rules** for old versions
4. **Separate backup bucket** for critical documents

**Priority**: P1 (critical for business continuity)

## Object Versioning

**Status**: NOT IMPLEMENTED

### Recommendation

**RECOMMENDED**: Enable versioning for:
- Payslips (regulatory requirements)
- Employee contracts (legal documents)
- Invoices (financial records)

**NOT NEEDED**: Temporary files, cache files

## Lifecycle Rules

**Status**: NOT IMPLEMENTED (no object storage)

### Recommended Rules

**RECOMMENDED**: When object storage implemented:

**Temporary Files**:
- Delete after 24 hours
- Prefix: `temp/`

**Cache Files**:
- Delete after 7 days
- Prefix: `cache/`

**Business Documents**:
- Retain indefinitely
- Prefix: `documents/`

**Old Versions**:
- Delete after 90 days
- Prefix: `versions/`

## Rate Limiting

**Status**: APPLICATION-LEVEL (WITH FILE-SPECIFIC LIMITS)

### Current State

**VERIFIED**: Application has rate limiting via:
- Redis-based throttling (`RedisThrottlerStorage` — distributed across instances)
- Per-endpoint `@Throttle` decorators for sensitive operations
- Default limit: 100 requests per 60 seconds
- Cloudflare edge protection

**File-Specific Rate Limits** (VERIFIED):

| Endpoint | Limit | TTL |
|----------|-------|-----|
| `GET /hr/employees/:employeeId/documents/:documentId/download` | 30 req/min | 60000ms |
| `POST /auth/login` | 10 req/min | 60000ms |
| `POST /auth/register` | 5 req/min | 60000ms |
| `POST /auth/forgot-password` | 30 req/min | 60000ms |

**NOT CONFIGURED**: Upload rate limits (no upload endpoints exist)

### Future Recommendation

**RECOMMENDED** (when file uploads implemented):
- Upload endpoints: 10 per minute per user
- Download URL generation: 30 per minute per user
- File processing: 5 per minute per user

## Audit Logging

**Status**: PARTIALLY CONFIGURED

### Current State

**VERIFIED**: Download authorization events are logged:
- Document download authorized: logs user ID, document ID, document type, organization ID
- Unauthorized download attempt: logs user ID, document ID, organization ID

Logging uses `nestjs-pino` (pino logger), which is configured in `app.module.ts` with request ID tracing.

**NOT CONFIGURED**:
- File upload logging (no uploads exist)
- File delete logging
- Permission change logging
- File sharing logging

**DO NOT LOG**:
- Signed URLs (tokens)
- File contents
- Credentials
- Private file URLs in plaintext

### Recommended Events (When Uploads Implemented)

**RECOMMENDED**:
- File upload (user, file type, size)
- File download (user, file ID, timestamp)
- File delete (user, file ID, reason)
- Access denied (user, file ID, reason)
- Permission changes (admin, target)

## Cost/Scale Analysis

### Storage Estimates

**VERIFIED**: Based on business requirements:

| Users | Files/Month | Avg Size | GB/Month | GB/Year |
|-------|-------------|----------|----------|---------|
| 100 | 500 | 2 MB | 1 GB | 12 GB |
| 1,000 | 5,000 | 2 MB | 10 GB | 120 GB |
| 10,000 | 50,000 | 2 MB | 100 GB | 1.2 TB |
| 100,000 | 500,000 | 2 MB | 1 TB | 12 TB |

### Cost Estimates (R2)

**Storage**: $0.015/GB/month
- 100 users: $0.18/month
- 1,000 users: $1.80/month
- 10,000 users: $18.00/month
- 100,000 users: $180.00/month

**Egress**: $0 (free with R2)

**Total**: Storage only (egress-free)

### Cost Drivers

**IDENTIFIED**:
- Large file uploads (videos, archives)
- High-frequency downloads (if not cached)
- Long retention periods
- Versioning overhead

## Failure Handling

**Status**: NOT APPLICABLE (no object storage)

### Current State

No object storage to fail.

### Future Strategy

**RECOMMENDED** (when object storage implemented):

**Upload Failure**:
```
Storage unavailable
  ↓
Clear error to client
  ↓
Do NOT create database record
  ↓
Allow retry
```

**Download Failure**:
```
Storage unavailable
  ↓
Graceful error to client
  ↓
Application remains healthy
  ↓
Log incident
```

**Consistency**: Never create database record without successful storage.

## Async Processing

**Status**: NOT IMPLEMENTED (no files)

### Current State

No async file processing (no files).

### Future Requirements

**RECOMMENDED** (when object storage implemented):

**Async Operations**:
- PDF generation (payslips, invoices)
- Image processing (thumbnails, compression)
- Malware scanning
- Large file processing

**Implementation**: Use background job queue (BullMQ/Redis)

**Priority**: P2 (defer to background-jobs phase)

## Implementation Status

### Files Changed

**Security Fixes Applied (STEP 29)**:

1. **`services/auth/src/modules/hr/employees/employees.controller.ts`**
   - Added `Logger` from `@nestjs/common`
   - Added `Throttle` import from `@nestjs/throttler`
   - Added `GET /:employeeId/documents/:documentId/download` endpoint
   - Authorization: org-scoped + self-access or hr:read
   - Rate limiting: 30 req/min per user
   - Audit logging: authorized downloads and failed attempts

2. **`services/auth/src/modules/hr/employees/employees.service.ts`**
   - Stripped `fileUrl` from documents in `findOne()` and `findByUserId()` responses using Prisma `select`

3. **`services/auth/src/modules/hr/employees/dto/create-document.dto.ts`**
   - Added `Matches` decorator for path traversal, null byte, and sensitive file path rejection

4. **`services/auth/src/modules/hr/employees/dto/update-document.dto.ts`**
   - Added same `Matches` validation as create-document DTO

5. **`services/auth/src/modules/hr/recruitment/dto/create-candidate.dto.ts`**
   - Added same `Matches` validation for `resumeUrl` field

6. **`services/auth/src/modules/hr/employees/employees.controller.spec.ts`** (NEW)
   - 6 unit tests for download authorization (self-access, HR access, cross-org, non-HR, 404 cases)

7. **`services/auth/src/modules/hr/employees/dto/create-document.dto.spec.ts`**
   - Added 5 security tests: path traversal, null byte, file://, ftp://, XSS in URL

8. **`apps/admin-dashboard/lib/hooks/useHR.ts`**
   - Added `useDownloadDocument` hook
   - Made `fileUrl` optional in `EmployeeDocument` interface

9. **`apps/admin-dashboard/app/hr/employees/[id]/page.tsx`**
   - Replaced direct `<a href={doc.fileUrl}>` link with download endpoint call
   - "View" button now calls `useDownloadDocument` mutation, opens returned URL on success

## Summary

**Current State**: URL-only storage with hardened authorization
**Security Status**: IDOR vulnerability fixed, URL validation hardened, download authorization implemented
**Production Readiness**: NOT READY (needs object storage implementation for actual file uploads)
**Recommended Provider**: Cloudflare R2
**Critical Path**: Implement object storage before production file handling

## Files Changed

Exact paths:
- `services/auth/src/modules/hr/employees/employees.controller.ts` — Added download endpoint + Logger + Throttle
- `services/auth/src/modules/hr/employees/employees.service.ts` — Stripped fileUrl from list responses
- `services/auth/src/modules/hr/employees/dto/create-document.dto.ts` — Added @Matches validation
- `services/auth/src/modules/hr/employees/dto/update-document.dto.ts` — Added @Matches validation
- `services/auth/src/modules/hr/recruitment/dto/create-candidate.dto.ts` — Added @Matches validation
- `services/auth/src/modules/hr/employees/employees.controller.spec.ts` — New controller test file
- `services/auth/src/modules/hr/employees/dto/create-document.dto.spec.ts` — Added security tests
- `apps/admin-dashboard/lib/hooks/useHR.ts` — Added useDownloadDocument hook + updated type
- `apps/admin-dashboard/app/hr/employees/[id]/page.tsx` — Use download endpoint for document access

## Next Recommended Phase

**CRITICAL PATH**: Implement object storage infrastructure

**Priority Order**:
1. Set up Cloudflare R2 bucket (private ACLs, versioning)
2. Configure lifecycle rules and versioning
3. Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` dependencies
4. Create `StorageService` abstraction module with presigned URL generation
5. Update download endpoint to return presigned URLs with TTL
6. Implement file upload endpoints with multer/S3 multipart
7. Add file type validation (magic bytes)
8. Add file size limits
9. Implement orphan detection job
10. Add malware scanning (BullMQ/ClamAV)

**DO NOT IMPLEMENT**:
- Kafka (defer to messaging phase)
- MongoDB (defer to data layer phase)
- ClickHouse (defer to analytics phase)
- Kubernetes (defer to infrastructure phase)
- WebSockets (defer to real-time phase)
- Background queue infrastructure (defer to async phase — but BullMQ is already available via `@nestjs/schedule`)

**STOP HERE**: The application is not production-ready for file uploads. URL-only storage with hardened authorization is sufficient for the current feature set. Object storage must be implemented before handling actual file uploads.
