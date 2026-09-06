# Seeded Users Credentials - AgencyOS

## Database Seeding Complete ✅

Database has been successfully seeded with test users for all roles. All users can now login and access their respective dashboards.

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

## User Management Features

### Admin/Super Admin Capabilities:

1. **View All Users** - Navigate to `/settings/users` to see all team members grouped by role
2. **Create New Users** - Click "Invite Member" to create new users with specific roles
3. **Edit Users** - Click "Edit" on any user to modify their details, roles, or status
4. **Activate/Deactivate** - Toggle user account status to control access
5. **Delete Users** - Remove users from the organization completely

### Role-Based Access Control:

- **Super Admin**: Complete system access, user management, RBAC control
- **Admin**: Full access to all modules except system-level settings
- **Sales Agent**: CRM, clients, leads management
- **Support Agent**: Helpdesk, tickets, support operations
- **HR Agent**: HR management, employee records, payroll access
- **Agent**: General agent access and task management
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

### 3. Test Logout Functionality:
- Click logout from any dashboard
- Should be immediately redirected to login page
- Session should be completely destroyed
- Try accessing protected routes - should be redirected to login

### 4. Test User Management (Admin/Super Admin only):
- Login as admin or super admin
- Navigate to `/settings/users`
- Test creating a new user
- Test editing existing user details
- Test activating/deactivating users
- Test deleting users

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

### User Management Frontend:
- Page: `apps/admin-dashboard/app/(admin)/settings/users/page.tsx`
- Component: `apps/admin-dashboard/components/UserFormSheet.tsx`

### Logout Implementation:
- Fixed to ensure complete session destruction
- Hard redirect to login page after logout
- Multiple cookie clearing strategies
- Complete storage cleanup (sessionStorage + localStorage)

## Next Steps

1. ✅ Database seeded with all role-based users
2. ✅ User management interface enabled for admin/super admin
3. ✅ Logout functionality fixed across all roles
4. ✅ Role-based access control implemented
5. ⏳ Test all login credentials manually
6. ⏳ Verify role-based dashboard access
7. ⏳ Test user creation and management features

---

**Status**: Ready for testing 🚀
**Last Updated**: 2026-08-19
**Environment**: Development (Docker Compose)