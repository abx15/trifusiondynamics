# RBAC (Role-Based Access Control) Structure

## Overview

AgencyOS uses a multi-tenant RBAC system with two levels of access control:
1. **Platform Level** - Superadmin with universal access across all organizations
2. **Organization Level** - Admin with scoped access within their organization only

## Roles Hierarchy

### Platform Level (Superadmin)

#### Superadmin / Super_Admin
- **Scope**: Universal access across all organizations
- **Permissions**: All platform permissions including:
  - Create, manage, and archive organizations
  - View global platform statistics and telemetry
  - Manage users across all organizations
  - Assign any role including superadmin
  - Access developer tools and system-level operations
- **Security**: Only superadmins can assign superadmin roles to other users
- **Use Case**: Platform administration, system maintenance, cross-organization oversight

### Organization Level

#### Admin
- **Scope**: Single organization only
- **Permissions**: Organization-level permissions:
  - Manage users within their organization (create, update, delete)
  - Assign roles (except superadmin/super_admin)
  - Access all business modules (CRM, Billing, HR, Projects, etc.)
  - Manage helpdesk tickets and SLA policies
  - Configure automation and workflows
  - View organization analytics
- **Restrictions**:
  - Cannot assign superadmin/super_admin roles
  - Cannot move users between organizations
  - Cannot access other organizations' data
  - Cannot access developer:write or super_admin:all permissions
- **Use Case**: Organization administration, employee management, business operations

#### Agent Roles
- **Scope**: Single organization
- **Permissions**: Department-specific access
  - **Sales Agent**: CRM, clients, leads
  - **Support Agent**: Helpdesk, tickets, knowledge base
  - **HR Agent**: HR, employees, recruitment, payroll
- **Use Case**: Department-specific operations

#### Employee
- **Scope**: Single organization
- **Permissions**: Basic access to assigned modules
- **Use Case**: Regular staff members

#### Client
- **Scope**: Single organization (linked via clientId)
- **Permissions**: Client portal access
  - View assigned tickets
  - View project progress
  - View invoices
- **Use Case**: External client portal users

## Organization Isolation

### Database Level
- Every `User` record has an `organizationId` field
- All queries automatically filter by `organizationId` (except superadmin)
- Superadmin bypasses organization filtering

### API Level
- JWT token includes `orgId` claim
- Controllers pass `orgId` to services
- Services enforce organization boundaries:
  ```typescript
  // Regular admin can only access their org
  where: { id, organizationId: orgId }

  // Superadmin can access any org
  where: { id }
  ```

### Role Assignment Security
- Regular admins cannot assign superadmin roles
- Role assignment is validated before execution:
  ```typescript
  if (!isSuperAdmin && hasSuperAdminRole) {
    throw new ForbiddenException(
      'Organization administrators cannot assign superadmin roles'
    );
  }
  ```

### User Management Isolation
- **Create User**: Admin can only create users in their org; superadmin can create in any org
- **Update User**: Admin cannot change `organizationId`; superadmin can move users between orgs
- **Delete User**: Admin can only delete users in their org; superadmin can delete any user
- **List Users**: Admin sees only their org users; superadmin sees all users

## Permission Matrix

| Permission | Superadmin | Admin | Sales Agent | Support Agent | HR Agent | Employee | Client |
|------------|------------|-------|-------------|---------------|----------|----------|--------|
| crm:read | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| crm:write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| billing:read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| billing:write | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| hr:read | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| hr:write | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| projects:read | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| projects:write | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| clients:read | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| clients:write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| payroll:read | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| payroll:write | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| helpdesk:read | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| helpdesk:write | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| helpdesk:assign | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| helpdesk:close | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| helpdesk:escalate | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| documents:read | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| documents:write | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| ai:read | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| ai:write | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| analytics:read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| automation:read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| automation:write | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| developer:read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| developer:write | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| super_admin:all | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Security Guarantees

### 1. Tenant Isolation
- All data queries automatically scoped to organization
- Superadmin can override with explicit permission
- Database schema enforces foreign key constraints

### 2. Role Elevation Prevention
- Regular admins cannot assign superadmin roles
- Role changes are validated in transaction
- Audit logs track all role assignments

### 3. Data Leakage Prevention
- JWT token never includes other organizations' data
- API responses never include cross-organization data
- Logging and monitoring detect unauthorized access attempts

### 4. Principle of Least Privilege
- Default permissions are minimal
- Explicit grants required for additional access
- Permissions are granular and specific

## Implementation Details

### Seed Data
See `packages/database/seed.ts` for role and permission initialization:
- Roles are created during database seeding
- Permissions are assigned to roles
- Superadmin gets all permissions
- Admin gets organization-level permissions (excludes developer:write, super_admin:all)

### API Guards
- `JwtAuthGuard` - Validates JWT token
- `PermissionsGuard` - Checks required permissions
- `RolesGuard` - Checks role membership
- `Actor` decorator - Injects authorization context

### Service Layer
All user management operations in `UsersService` enforce:
- Organization boundary checks
- Role assignment validation
- Superadmin privilege validation

## Migration Strategy

If you have existing admin users with platform-level permissions, run:

```bash
# Re-seed database to update role permissions
pnpm --filter database exec -- npx prisma db seed
```

This will:
1. Update admin role permissions (remove platform-level access)
2. Keep superadmin role unchanged
3. Add organization-level permissions to admin role

## Testing

### Test Organization Isolation
```bash
# As admin, try to access other org's users
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8000/api/users/<other-org-user-id>
# Expected: 404 Not Found

# As superadmin, access any user
curl -H "Authorization: Bearer <superadmin-token>" \
  http://localhost:8000/api/users/<any-user-id>
# Expected: 200 OK
```

### Test Role Assignment Security
```bash
# As admin, try to assign superadmin role
curl -X PATCH \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"roles": ["superadmin"]}' \
  http://localhost:8000/api/users/<user-id>/approve
# Expected: 403 Forbidden
```

## Troubleshooting

### Admin Cannot Create Users
- Check that admin has `hr:write` permission
- Verify JWT token includes valid `orgId`
- Ensure organization is active

### Admin Cannot Assign Roles
- Verify role is not superadmin/super_admin
- Check that admin has `hr:write` permission
- Review role assignment security logs

### Superadmin Not Working
- Verify JWT token includes superadmin role
- Check that role permissions are seeded correctly
- Ensure superadmin is in the correct organization

## References

- `packages/database/seed.ts` - Role and permission seeding
- `services/auth/src/modules/users/users.service.ts` - User management logic
- `services/auth/src/common/auth/actor.decorator.ts` - Authorization context
- `services/auth/src/modules/users/users.controller.ts` - API endpoints
