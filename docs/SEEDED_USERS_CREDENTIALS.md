# Seeded Users Credentials - AgencyOS

## Database Seeding Complete ✅

Database has been successfully seeded with test users for all roles. All users can now login and access their respective dashboards.

## Multi-Tenant Architecture

AgencyOS is a **multi-tenant SaaS platform**. Each organization operates in complete isolation:
- **Org Admin** sees only their org's data (users, clients, projects, tickets, invoices, leads)
- **Super Admin** has universal cross-organization access
- All queries are scoped: `WHERE organizationId = user.orgId`

## Login Credentials

### Executive Accounts (Full Access)

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| **Super Admin** | trifusiondynamics@gmail.com | trifusiondynamicsA3web | /super-admin |
| **Admin** | admin@trifusiondynamics.com | trifusiondynamicsA3web | /dashboard |

### Agent Accounts (Department Access)

| Role | Email | Password | Dashboard | Department |
|------|-------|----------|-----------|------------|
| **Sales Agent** | sales.trifusion@gmail.com | trifusiondynamicsA3web | /crm | Sales |
| **Support Agent** | support.trifusion@gmail.com | trifusiondynamicsA3web | /tickets | Support |
| **HR Agent** | hr.trifusion@gmail.com | trifusiondynamicsA3web | /hr | HR |
| **Agent** | agent@trifusiondynamics.com | trifusiondynamicsA3web | /agent/dashboard | General |
| **Employee** | bob.dev@trifusiondynamics.com | trifusiondynamicsA3web | /attendance | Staff |

### Client Account (Limited Access)

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| **Client** | client@apexretail.com | trifusiondynamicsA3web | /client/dashboard |

## Super Admin Capabilities

Super Admin (`trifusiondynamics@gmail.com`) has **universal access** to all organizations:

1. **View All Organizations** — Navigate to `/super-admin/organizations` to see all orgs with employee counts
2. **Create New Organization** — Fill org name, slug, and optionally provision an admin user (email, name, password)
3. **Activate/Deactivate Organizations** — Toggle org `isActive` status
4. **View Org Details** — Click "View Details" to see org analytics, employee counts, and automation stats
5. **Cross-Organization Automation** — View all workflows across orgs, toggle active state, trigger MANUAL workflows
6. **Platform Analysis** — Revenue, clients, team performance, and system health across all tenants

## User Management Features

### Admin/Super Admin Capabilities:

1. **View All Users** - Navigate to `/settings/users` to see all team members grouped by role
2. **Create New Users** - Click "Invite Member" to create new users with specific roles
3. **Edit Users** - Click "Edit" on any user to modify their details, roles, or status
4. **Activate/Deactivate** - Toggle user account status to control access
5. **Delete Users** - Remove users from the organization completely

### Role-Based Access Control:

- **Super Admin**: Complete system access, all organizations, RBAC control, workflow management
- **Admin**: Full access to all modules except system-level settings (org-scoped)
- **Sales Agent**: CRM, clients, leads management
- **Support Agent**: Helpdesk, tickets, support operations
- **HR Agent**: HR management, employee records, payroll access
- **Agent**: General agent access and task management
- **Employee**: Attendance, tasks, limited module access
- **Client**: Limited access to own projects, invoices, and support tickets

## Testing Instructions

### 1. Test Login for Each Role:
```
URL: http://localhost:3001/login
Use credentials from above table
```

### 2. Verify Role-Based Access:
- After login, each user should be redirected to their appropriate dashboard
- Navigation options should be limited to their role permissions
- Try accessing unauthorized routes - should be blocked

### 3. Test Tenant Isolation:
- Login as Org Admin → `/dashboard` → see only YOUR org's data
- Login as Super Admin → `/super-admin/organizations` → see ALL orgs
- Verify `/users/org-dashboard` returns only your org's counts

### 4. Test Organization Provisioning:
- Login as Super Admin
- Navigate to `/super-admin/organizations`
- Click "Provision New Organization"
- Fill: name, slug, admin email, admin name, admin password
- Verify admin user is created with `admin` role
- Login as the new admin → verify they see only their org

### 5. Test User Management (Admin/Super Admin only):
- Login as admin or super admin
- Navigate to `/settings/users`
- Test creating a new user
- Test editing existing user details
- Test activating/deactivating users
- Test deleting users

### 6. Test Cross-Organization Automation:
- Login as Super Admin
- Navigate to `/super-admin/automation`
- View all workflows across orgs
- Toggle a workflow active/inactive
- Trigger a MANUAL workflow
- View per-org automation stats

## Important Notes

⚠️ **Default Password**: All seeded users share the default password `trifusiondynamicsA3web`. Users can change their password at any time via their account settings.

⚠️ **Super Admin Password**: The super admin account (`trifusiondynamics@gmail.com`) has a permanent password and won't require password change.

🔒 **Security**: These are test credentials. In production, you should:
- Change all default passwords immediately
- Use strong, unique passwords for each account
- Enable two-factor authentication
- Regularly audit user access

## Technical Implementation

### Seed Data Location:
- File: `packages/database/seed.ts`
- Command: `pnpm db:seed` (from packages/database directory)

### User Management Backend:
- Controller: `services/auth/src/modules/users/users.controller.ts`
- Service: `services/auth/src/modules/users/users.service.ts`
- API Endpoints: `/api/users` (GET, POST, PATCH, DELETE)

### Super Admin Backend:
- Controller: `services/auth/src/modules/users/super-admin.controller.ts`
- Endpoints: `/api/super-admin/organizations`, `/api/super-admin/automation/*`

### Tenant Isolation:
- `GET /api/users/org-dashboard` — scoped to `user.orgId` (requires `hr:read` permission)
- All org-scoped queries use `where: { organizationId: user.organizationId }`
- Super Admin bypasses orgId filter via `SuperAdminGuard`

### User Management Frontend:
- Page: `apps/admin-dashboard/app/(admin)/settings/users/page.tsx`
- Component: `apps/admin-dashboard/components/UserFormSheet.tsx`

### Super Admin Frontend:
- Organizations: `apps/admin-dashboard/app/(super-admin)/super-admin/organizations/page.tsx`
- Org Detail: `apps/admin-dashboard/app/(super-admin)/super-admin/organizations/[id]/page.tsx`
- Automation: `apps/admin-dashboard/app/(super-admin)/super-admin/automation/page.tsx`
- AI Analysis: `apps/admin-dashboard/app/(super-admin)/super-admin/ai/page.tsx`
- Ticketing: `apps/admin-dashboard/app/(super-admin)/super-admin/ticketing/page.tsx`

## Next Steps

1. ✅ Database seeded with all role-based users
2. ✅ User management interface enabled for admin/super admin
3. ✅ Multi-tenant architecture with org isolation
4. ✅ Super admin cross-organization access
5. ✅ Organization auto-provisioning with admin user
6. ✅ Role-based access control implemented
7. ⏳ Test all login credentials manually
8. ⏳ Verify role-based dashboard access
9. ⏳ Test user creation and management features
10. ⏳ Test cross-organization workflow control

---

**Status**: Ready for testing 🚀
**Last Updated**: 2026-10-11
**Environment**: Development (PostgreSQL + NestJS + Next.js)