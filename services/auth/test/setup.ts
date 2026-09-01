import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

let prisma: PrismaClient;

beforeAll(async () => {
  // SAFETY: Ensure we're not connecting to production database
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TEST SAFETY: Tests cannot run in production environment. ' +
        'Set NODE_ENV=test or ensure TEST_DATABASE_URL is configured.',
    );
  }

  // Use the test database
  process.env.MONGODB_URI = 'mongodb://localhost:27017/trifusion_test';
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/trifusion_test';

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Reset database schema and run migrations
  console.log('Resetting test database...');
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'ignore',
    });
  } catch {
    console.log('Migration reset failed, continuing...');
  }

  // Seed test fixtures
  const org = await prisma.organization.create({
    data: {
      name: 'Test Org',
      slug: 'test-org',
    },
  });

  // Create roles
  const adminRole = await prisma.role.create({
    data: { name: 'admin', description: 'Administrator' },
  });

  const employeeRole = await prisma.role.create({
    data: { name: 'employee', description: 'Employee' },
  });

  const clientRole = await prisma.role.create({
    data: { name: 'client', description: 'Client' },
  });

  // Create permissions
  const permissions = await Promise.all([
    prisma.permission.create({ data: { action: 'crm:read' } }),
    prisma.permission.create({ data: { action: 'crm:write' } }),
    prisma.permission.create({ data: { action: 'crm:delete' } }),
    prisma.permission.create({ data: { action: 'projects:read' } }),
    prisma.permission.create({ data: { action: 'projects:write' } }),
    prisma.permission.create({ data: { action: 'projects:delete' } }),
    prisma.permission.create({ data: { action: 'hr:read' } }),
    prisma.permission.create({ data: { action: 'hr:write' } }),
    prisma.permission.create({ data: { action: 'hr:delete' } }),
    prisma.permission.create({ data: { action: 'billing:read' } }),
    prisma.permission.create({ data: { action: 'billing:write' } }),
    prisma.permission.create({ data: { action: 'billing:delete' } }),
    prisma.permission.create({ data: { action: 'ai:read' } }),
    prisma.permission.create({ data: { action: 'ai:write' } }),
    prisma.permission.create({ data: { action: 'analytics:read' } }),
    prisma.permission.create({ data: { action: 'analytics:write' } }),
    prisma.permission.create({ data: { action: 'automation:read' } }),
    prisma.permission.create({ data: { action: 'automation:write' } }),
    prisma.permission.create({ data: { action: 'automation:delete' } }),
    prisma.permission.create({ data: { action: 'developer:read' } }),
    prisma.permission.create({ data: { action: 'developer:write' } }),
    prisma.permission.create({ data: { action: 'developer:delete' } }),
    prisma.permission.create({ data: { action: 'users:read' } }),
    prisma.permission.create({ data: { action: 'users:write' } }),
    prisma.permission.create({ data: { action: 'users:delete' } }),
  ]);

  // Assign all permissions to admin role
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  // Assign limited permissions to employee role
  const employeePermissions = permissions.filter((p) =>
    [
      'crm:read',
      'projects:read',
      'projects:write',
      'hr:read',
      'ai:read',
      'ai:write',
      'analytics:read',
    ].includes(p.action),
  );
  await Promise.all(
    employeePermissions.map((permission) =>
      prisma.rolePermission.create({
        data: {
          roleId: employeeRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  // Assign limited permissions to client role
  const clientPermissions = permissions.filter((p) =>
    ['projects:read', 'billing:read'].includes(p.action),
  );
  await Promise.all(
    clientPermissions.map((permission) =>
      prisma.rolePermission.create({
        data: {
          roleId: clientRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  // Hash password for test users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create test users
  const adminUser = await prisma.user.create({
    data: {
      id: 'admin-user-id',
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin Test',
      organizationId: org.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      id: 'employee-user-id',
      email: 'employee@test.com',
      password: hashedPassword,
      name: 'Employee Test',
      organizationId: org.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      id: 'client-user-id',
      email: 'client@test.com',
      password: hashedPassword,
      name: 'Client Test',
      organizationId: org.id,
      isActive: true,
      mustChangePassword: false,
      linkedClientId: 'client-record-id',
    },
  });

  // Assign roles to users
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: employeeUser.id,
      roleId: employeeRole.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: clientUser.id,
      roleId: clientRole.id,
    },
  });

  console.log('Test database seeded successfully');
});

afterAll(async () => {
  await prisma.$disconnect();
});
