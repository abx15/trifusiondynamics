const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

require('dotenv').config({ path: '../../.env' });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } }
});

async function updateDatabaseUsers() {
  console.log('🔄 Connecting to Neon Database and updating role accounts...');

  // Ensure default organization exists
  const org = await prisma.organization.upsert({
    where: { slug: 'tfx-ai-demo-org' },
    update: {},
    create: {
      name: 'TFX AI Demo Org',
      slug: 'tfx-ai-demo-org',
    },
  });
  console.log('✅ Organization loaded:', org.id);

  // Roles to guarantee in DB
  const roles = [
    { name: 'superadmin', description: 'Super Administrator with ultimate authority' },
    { name: 'super_admin', description: 'Super Administrator with ultimate authority' },
    { name: 'admin', description: 'Administrator with full operational access' },
    { name: 'sales_agent', description: 'Sales & Partnerships Agent' },
    { name: 'support_agent', description: 'Support Team Agent' },
    { name: 'hr_agent', description: 'HR & People Agent' },
    { name: 'agent', description: 'General Operational Agent' },
    { name: 'employee', description: 'Staff Employee' },
    { name: 'client', description: 'External Client Portal' },
  ];

  const dbRoles = {};
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    dbRoles[r.name] = role;
  }
  console.log('✅ All 9 roles upserted.');

  // Accounts to configure with verified passwords and mustChangePassword: false
  const accounts = [
    {
      email: 'trifusiondynamics@gmail.com',
      password: 'trifusiondynamicsA3web',
      name: 'Trifusion-Dynamics SuperAdmin',
      roles: ['superadmin', 'super_admin', 'admin'],
    },
    {
      email: 'admin@trifusiondynamics.com',
      password: 'ChangeThisPassword123!',
      name: 'Operations Administrator',
      roles: ['admin', 'superadmin'],
    },
    {
      email: 'sales.trifusion@gmail.com',
      password: 'Welcome@123',
      name: 'Sales & Partnerships',
      roles: ['sales_agent', 'agent'],
    },
    {
      email: 'support.trifusion@gmail.com',
      password: 'Welcome@123',
      name: 'Support Team Lead',
      roles: ['support_agent', 'agent'],
    },
    {
      email: 'hr.trifusion@gmail.com',
      password: 'Welcome@123',
      name: 'HR & People Manager',
      roles: ['hr_agent', 'agent'],
    },
    {
      email: 'agent@trifusiondynamics.com',
      password: 'Agent@123',
      name: 'Jane Agent',
      roles: ['agent'],
    },
    {
      email: 'bob.dev@trifusiondynamics.com',
      password: 'Welcome@123',
      name: 'Bob Developer',
      roles: ['employee', 'agent'],
    },
    {
      email: 'client@apexretail.com',
      password: 'Client@123',
      name: 'Sanjay Singhania (Apex Retail)',
      roles: ['client'],
    },
  ];

  for (const acc of accounts) {
    const passHash = await bcrypt.hash(acc.password, 12);
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        password: passHash,
        name: acc.name,
        isActive: true,
        mustChangePassword: false,
        organizationId: org.id,
      },
      create: {
        email: acc.email,
        password: passHash,
        name: acc.name,
        isActive: true,
        mustChangePassword: false,
        organizationId: org.id,
      },
    });

    // Remove existing roles and assign clean expected roles
    await prisma.userRole.deleteMany({ where: { userId: user.id } });

    for (const roleName of acc.roles) {
      if (dbRoles[roleName]) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: dbRoles[roleName].id,
          },
        });
      }
    }
    console.log(`✅ Configured user: ${acc.email} | Roles: [${acc.roles.join(', ')}]`);
  }

  // Ensure all permissions are granted to superadmin and admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    for (const rName of ['superadmin', 'super_admin', 'admin']) {
      if (dbRoles[rName]) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: dbRoles[rName].id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: dbRoles[rName].id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  console.log('🎉 Database accounts successfully updated and verified!');
  await prisma.$disconnect();
}

updateDatabaseUsers().catch((err) => {
  console.error('❌ Error updating database:', err);
  process.exit(1);
});
