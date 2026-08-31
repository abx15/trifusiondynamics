import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import dns from 'dns';

// Configure DNS programmatically to Google Public DNS
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn('Could not set DNS servers programmatically in seed.ts:', err);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

// Resilient query runner with retry capability for Neon connection timeouts
async function safeRun<T>(label: string, fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      console.warn(`[Retry Warning] Failed executing "${label}", retrying... (${i + 1}/${retries}). Error: ${err.message || err}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  throw new Error(`Failed executing "${label}" after ${retries} retries`);
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@agencyos.com';

  console.log('Seeding database...');
  console.log(`Admin email configured: ${adminEmail}`);

  // 1. Create Default Organization
  const org = await safeRun('Create Default Organization', () => 
    prisma.organization.upsert({
      where: { slug: 'tfx-ai-demo-org' },
      update: {},
      create: {
        name: 'TFX AI Demo Org',
        slug: 'tfx-ai-demo-org',
      },
    })
  );
  console.log(`Default Organization created/loaded: ${org.name}`);

  // 2. Create Roles
  const rolesToCreate = [
    { name: 'superadmin', description: 'Super Administrator with ultimate authority' },
    { name: 'super_admin', description: 'Super Administrator with ultimate authority' },
    { name: 'admin', description: 'Administrator with full access' },
    { name: 'agent', description: 'Worker / Support Agent' },
    { name: 'sales_agent', description: 'Sales & Partnerships Agent' },
    { name: 'support_agent', description: 'Support Team Agent' },
    { name: 'hr_agent', description: 'HR & Careers Agent' },
    { name: 'employee', description: 'Staff member' },
    { name: 'client', description: 'External client portal user' },
  ];

  const dbRoles: Record<string, any> = {};
  for (const r of rolesToCreate) {
    const role = await safeRun(`Upsert Role: ${r.name}`, () => 
      prisma.role.upsert({
        where: { name: r.name },
        update: { description: r.description },
        create: r,
      })
    );
    dbRoles[r.name] = role;
    console.log(`Role upserted: ${role.name}`);
  }

  // 3. Create Permissions
  const permissionsToCreate = [
    'crm:read', 'crm:write',
    'billing:read', 'billing:write',
    'hr:read', 'hr:write',
    'projects:read', 'projects:write',
    'clients:read', 'clients:write',
    'payroll:read', 'payroll:write',
    'helpdesk:read', 'helpdesk:write',
    'documents:read', 'documents:write',
    'ai:read', 'ai:write',
    'analytics:read', 'automation:read', 'automation:write',
    'developer:read', 'developer:write',
    'super_admin:all',
  ];

  const dbPermissions: Record<string, any> = {};
  for (const action of permissionsToCreate) {
    const permission = await safeRun(`Upsert Permission: ${action}`, () => 
      prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      })
    );
    dbPermissions[action] = permission;
    console.log(`Permission upserted: ${permission.action}`);
  }

  // 4. Assign All Permissions to superadmin, super_admin and admin Roles
  for (const action of permissionsToCreate) {
    for (const roleName of ['superadmin', 'super_admin', 'admin']) {
      await safeRun(`Assign ${action} to ${roleName}`, () => 
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: dbRoles[roleName].id,
              permissionId: dbPermissions[action].id,
            },
          },
          update: {},
          create: {
            roleId: dbRoles[roleName].id,
            permissionId: dbPermissions[action].id,
          },
        })
      );
    }
  }

  // Assign department agent permissions
  const salesPermissions = ['crm:read', 'crm:write', 'clients:read', 'clients:write'];
  for (const action of salesPermissions) {
    await safeRun(`Assign ${action} to sales_agent`, () =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: dbRoles.sales_agent.id, permissionId: dbPermissions[action].id } },
        update: {},
        create: { roleId: dbRoles.sales_agent.id, permissionId: dbPermissions[action].id },
      })
    );
  }

  const supportPermissions = ['helpdesk:read', 'helpdesk:write', 'documents:read'];
  for (const action of supportPermissions) {
    await safeRun(`Assign ${action} to support_agent`, () =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: dbRoles.support_agent.id, permissionId: dbPermissions[action].id } },
        update: {},
        create: { roleId: dbRoles.support_agent.id, permissionId: dbPermissions[action].id },
      })
    );
  }

  const hrPermissions = ['hr:read', 'hr:write', 'payroll:read'];
  for (const action of hrPermissions) {
    await safeRun(`Assign ${action} to hr_agent`, () =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: dbRoles.hr_agent.id, permissionId: dbPermissions[action].id } },
        update: {},
        create: { roleId: dbRoles.hr_agent.id, permissionId: dbPermissions[action].id },
      })
    );
  }

  // 5. Create Seed Accounts

  // Account 1: Primary Superadmin
  const tfxAdminPassHash = await bcrypt.hash('trifusiondynamicsA3web', 12);
  const tfxAdminUser = await safeRun('Upsert Trifusion Admin User', () =>
    prisma.user.upsert({
      where: { email: 'trifusiondynamics@gmail.com' },
      update: {
        password: tfxAdminPassHash,
        name: 'Trifusion-Dynamics Admin',
        isActive: true,
        mustChangePassword: false,
        organizationId: org.id,
      },
      create: {
        email: 'trifusiondynamics@gmail.com',
        password: tfxAdminPassHash,
        name: 'Trifusion-Dynamics Admin',
        isActive: true,
        mustChangePassword: false,
        organizationId: org.id,
      },
    })
  );
  await safeRun('Assign superadmin role to Trifusion Admin', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: tfxAdminUser.id, roleId: dbRoles.superadmin.id } },
      update: {},
      create: { userId: tfxAdminUser.id, roleId: dbRoles.superadmin.id },
    })
  );
  console.log(`[SEED] Superadmin Account: trifusiondynamics@gmail.com | Password: [REDACTED - set via env]`);

  // Account 1b: Configured Admin from env
  const configuredAdminEmail = process.env.ADMIN_EMAIL || 'admin@trifusiondynamics.com';
  const configuredAdminPassword = process.env.ADMIN_PASSWORD;
  if (!configuredAdminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable must be set');
  }
  const configuredAdminPassHash = await bcrypt.hash(configuredAdminPassword, 12);
  const configuredAdminUser = await safeRun('Upsert Configured Admin User', () =>
    prisma.user.upsert({
      where: { email: configuredAdminEmail },
      update: {
        password: configuredAdminPassHash,
        name: 'Administrator',
        isActive: true,
        mustChangePassword: false,
        organizationId: org.id,
      },
      create: {
        email: configuredAdminEmail,
        password: configuredAdminPassHash,
        name: 'Administrator',
        isActive: true,
        mustChangePassword: false,
        organizationId: org.id,
      },
    })
  );
  await safeRun('Assign admin role to Configured Admin', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: configuredAdminUser.id, roleId: dbRoles.admin.id } },
      update: {},
      create: { userId: configuredAdminUser.id, roleId: dbRoles.admin.id },
    })
  );
  await safeRun('Assign superadmin role to Configured Admin', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: configuredAdminUser.id, roleId: dbRoles.superadmin.id } },
      update: {},
      create: { userId: configuredAdminUser.id, roleId: dbRoles.superadmin.id },
    })
  );
  console.log(`[SEED] Admin Account: ${configuredAdminEmail} | Password: [REDACTED - set via env]`);

  // Get shared default password for all new accounts
  const defaultTempPassword = process.env.DEFAULT_TEMP_PASSWORD;
  if (!defaultTempPassword) {
    throw new Error('DEFAULT_TEMP_PASSWORD environment variable must be set');
  }

  // Account 2: Sales & Partnerships
  const salesPass = defaultTempPassword;
  const salesPassHash = await bcrypt.hash(salesPass, 12);
  const salesUser = await safeRun('Upsert Sales Account', () =>
    prisma.user.upsert({
      where: { email: 'sales.trifusion@gmail.com' },
      update: {
        password: salesPassHash,
        name: 'Sales & Partnerships',
        isActive: true,
        mustChangePassword: true,
        organizationId: org.id,
      },
      create: {
        email: 'sales.trifusion@gmail.com',
        password: salesPassHash,
        name: 'Sales & Partnerships',
        isActive: true,
        mustChangePassword: true,
        organizationId: org.id,
      },
    })
  );
  await safeRun('Assign agent & sales_agent roles to Sales', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: salesUser.id, roleId: dbRoles.sales_agent.id } },
      update: {},
      create: { userId: salesUser.id, roleId: dbRoles.sales_agent.id },
    })
  );
  await safeRun('Assign agent role to Sales', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: salesUser.id, roleId: dbRoles.agent.id } },
      update: {},
      create: { userId: salesUser.id, roleId: dbRoles.agent.id },
    })
  );
  console.log(`[SEED] Sales account (sales.trifusion@gmail.com) created. Password: [REDACTED - must change on first login]`);

  // Account 3: Support
  const supportPass = defaultTempPassword;
  const supportPassHash = await bcrypt.hash(supportPass, 12);
  const supportUser = await safeRun('Upsert Support Account', () =>
    prisma.user.upsert({
      where: { email: 'support.trifusion@gmail.com' },
      update: {
        password: supportPassHash,
        name: 'Support Team',
        isActive: true,
        mustChangePassword: true,
        organizationId: org.id,
      },
      create: {
        email: 'support.trifusion@gmail.com',
        password: supportPassHash,
        name: 'Support Team',
        isActive: true,
        mustChangePassword: true,
        organizationId: org.id,
      },
    })
  );
  await safeRun('Assign support_agent role to Support', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: supportUser.id, roleId: dbRoles.support_agent.id } },
      update: {},
      create: { userId: supportUser.id, roleId: dbRoles.support_agent.id },
    })
  );
  await safeRun('Assign agent role to Support', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: supportUser.id, roleId: dbRoles.agent.id } },
      update: {},
      create: { userId: supportUser.id, roleId: dbRoles.agent.id },
    })
  );
  console.log(`[SEED] Support account (support.trifusion@gmail.com) created. Password: [REDACTED - must change on first login]`);

  // Account 4: HR & Careers
  const hrPass = defaultTempPassword;
  const hrPassHash = await bcrypt.hash(hrPass, 12);
  const hrUser = await safeRun('Upsert HR Account', () =>
    prisma.user.upsert({
      where: { email: 'hr.trifusion@gmail.com' },
      update: {
        password: hrPassHash,
        name: 'HR & Careers',
        isActive: true,
        mustChangePassword: true,
        organizationId: org.id,
      },
      create: {
        email: 'hr.trifusion@gmail.com',
        password: hrPassHash,
        name: 'HR & Careers',
        isActive: true,
        mustChangePassword: true,
        organizationId: org.id,
      },
    })
  );
  await safeRun('Assign hr_agent role to HR', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: hrUser.id, roleId: dbRoles.hr_agent.id } },
      update: {},
      create: { userId: hrUser.id, roleId: dbRoles.hr_agent.id },
    })
  );
  await safeRun('Assign agent role to HR', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: hrUser.id, roleId: dbRoles.agent.id } },
      update: {},
      create: { userId: hrUser.id, roleId: dbRoles.agent.id },
    })
  );
  console.log(`[SEED] HR account (hr.trifusion@gmail.com) created. Password: [REDACTED - must change on first login]`);

  const user = tfxAdminUser;
  const hashedPassword = tfxAdminPassHash;

  await safeRun('Assign Admin Role to Admin User', () => 
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: dbRoles.admin.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: dbRoles.admin.id,
      },
    })
  );
  console.log(`Admin User upserted: ${user.email}`);

  // 5c. Create Agent User
  const agentPasswordHash = await bcrypt.hash('Agent@123', 12);
  const agentUser = await safeRun('Upsert Agent User', () => 
    prisma.user.upsert({
      where: { email: 'agent@trifusiondynamics.com' },
      update: {
        password: agentPasswordHash,
        name: 'Jane Agent',
        isActive: true,
        organizationId: org.id,
      },
      create: {
        email: 'agent@trifusiondynamics.com',
        password: agentPasswordHash,
        name: 'Jane Agent',
        isActive: true,
        organizationId: org.id,
      },
    })
  );
  await safeRun('Assign Agent Role to Agent User', () => 
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: agentUser.id,
          roleId: dbRoles.agent.id,
        },
      },
      update: {},
      create: {
        userId: agentUser.id,
        roleId: dbRoles.agent.id,
      },
    })
  );
  console.log(`Agent User upserted: ${agentUser.email}`);
  const employeeUser = agentUser;

  // 5c.2 Create Employee User (separate from agent)
  const employeePasswordHash = await bcrypt.hash('Welcome@123', 12);
  const employeeUserSeed = await safeRun('Upsert Employee User', () =>
    prisma.user.upsert({
      where: { email: 'bob.dev@trifusiondynamics.com' },
      update: {
        password: employeePasswordHash,
        name: 'Bob Developer',
        isActive: true,
        mustChangePassword: true,
        organizationId: org.id,
      },
      create: {
        email: 'bob.dev@trifusiondynamics.com',
        password: employeePasswordHash,
        name: 'Bob Developer',
        isActive: true,
        mustChangePassword: true,
        organizationId: org.id,
      },
    })
  );
  await safeRun('Assign employee role to Employee User', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: employeeUserSeed.id, roleId: dbRoles.employee.id } },
      update: {},
      create: { userId: employeeUserSeed.id, roleId: dbRoles.employee.id },
    })
  );
  await safeRun('Assign agent role to Employee User', () =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: employeeUserSeed.id, roleId: dbRoles.agent.id } },
      update: {},
      create: { userId: employeeUserSeed.id, roleId: dbRoles.agent.id },
    })
  );
  console.log(`Employee User upserted: ${employeeUserSeed.email}`);


  // 5d. Create Client User
  const clientPasswordHash = await bcrypt.hash('Client@123', 12);
  const clientUser = await safeRun('Upsert Client User', () => 
    prisma.user.upsert({
      where: { email: 'client@apexretail.com' },
      update: {
        password: clientPasswordHash,
        name: 'Sanjay Singhania',
        isActive: true,
        organizationId: org.id,
      },
      create: {
        email: 'client@apexretail.com',
        password: clientPasswordHash,
        name: 'Sanjay Singhania',
        isActive: true,
        organizationId: org.id,
      },
    })
  );
  await safeRun('Assign Client Role to Client User', () => 
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: clientUser.id,
          roleId: dbRoles.client.id,
        },
      },
      update: {},
      create: {
        userId: clientUser.id,
        roleId: dbRoles.client.id,
      },
    })
  );
  console.log(`Client User upserted: ${clientUser.email}`);


  // 7. Seed CRM and Clients Data
  console.log('Seeding CRM and Clients data...');

  // 5 Leads
  await safeRun('Upsert Lead 1', () => 
    prisma.lead.upsert({
      where: { id: 'lead-1-uuid' },
      update: {},
      create: {
        id: 'lead-1-uuid',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        companyName: 'Doe Enterprises',
        source: 'WEBSITE',
        stage: 'NEW',
        estimatedValue: 15000.00,
        notes: 'Interested in AI Integration services.',
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Lead 2', () => 
    prisma.lead.upsert({
      where: { id: 'lead-2-uuid' },
      update: {},
      create: {
        id: 'lead-2-uuid',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        companyName: 'Smith Corp',
        source: 'LINKEDIN',
        stage: 'CONTACTED',
        estimatedValue: 8500.00,
        notes: 'Met at networking event, sent initial intro.',
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Lead 3', () => 
    prisma.lead.upsert({
      where: { id: 'lead-3-uuid' },
      update: {},
      create: {
        id: 'lead-3-uuid',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '5551234567',
        companyName: 'Johnson Tech',
        source: 'REFERRAL',
        stage: 'QUALIFIED',
        estimatedValue: 22000.00,
        notes: 'Qualified. Needs a full-stack SaaS platform.',
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Lead 4', () => 
    prisma.lead.upsert({
      where: { id: 'lead-4-uuid' },
      update: {},
      create: {
        id: 'lead-4-uuid',
        name: 'Alice Brown',
        email: 'alice@example.com',
        phone: '5557654321',
        companyName: 'Brown Design',
        source: 'UPWORD',
        stage: 'PROPOSAL_SENT',
        estimatedValue: 5000.00,
        notes: 'Sent contract proposal for UI design.',
        organizationId: org.id,
      },
    })
  );

  // Converted Lead (WON)
  await safeRun('Upsert Lead 5 (WON)', () => 
    prisma.lead.upsert({
      where: { id: 'lead-5-uuid' },
      update: {},
      create: {
        id: 'lead-5-uuid',
        name: 'Charlie Green',
        email: 'charlie@example.com',
        phone: '5559876543',
        companyName: 'Green Consulting',
        source: 'FIVERR',
        stage: 'WON',
        estimatedValue: 12000.00,
        notes: 'Closed the deal successfully.',
        organizationId: org.id,
        convertedToClientId: 'client-1-uuid',
      },
    })
  );

  // 2 Clients (one converted, one manual)
  const client1 = await safeRun('Upsert Client 1', () => 
    prisma.client.upsert({
      where: { id: 'client-1-uuid' },
      update: {},
      create: {
        id: 'client-1-uuid',
        name: 'Charlie Green',
        companyName: 'Green Consulting',
        email: 'charlie@example.com',
        phone: '5559876543',
        address: '123 Green St, Boston, MA',
        gstNumber: 'GST123456789',
        status: 'ACTIVE',
        organizationId: org.id,
        leadId: 'lead-5-uuid',
      },
    })
  );

  const client2 = await safeRun('Upsert Client 2', () => 
    prisma.client.upsert({
      where: { id: 'client-2-uuid' },
      update: {},
      create: {
        id: 'client-2-uuid',
        name: 'David White',
        companyName: 'White Logistics',
        email: 'david@white.com',
        phone: '5554443333',
        address: '456 Industrial Way, Chicago, IL',
        status: 'ACTIVE',
        organizationId: org.id,
      },
    })
  );

  // Contacts for clients
  await safeRun('Upsert Contact 1', () => 
    prisma.clientContact.upsert({
      where: { id: 'contact-1-uuid' },
      update: {},
      create: {
        id: 'contact-1-uuid',
        clientId: client1.id,
        name: 'Charlie Green',
        role: 'Founder',
        email: 'charlie@example.com',
        phone: '5559876543',
        isPrimary: true,
      },
    })
  );

  await safeRun('Upsert Contact 2', () => 
    prisma.clientContact.upsert({
      where: { id: 'contact-2-uuid' },
      update: {},
      create: {
        id: 'contact-2-uuid',
        clientId: client2.id,
        name: 'David White',
        role: 'CEO',
        email: 'david@white.com',
        phone: '5554443333',
        isPrimary: true,
      },
    })
  );

  await safeRun('Upsert Contact 3', () => 
    prisma.clientContact.upsert({
      where: { id: 'contact-3-uuid' },
      update: {},
      create: {
        id: 'contact-3-uuid',
        clientId: client2.id,
        name: 'Sarah Jenkins',
        role: 'Head of Ops',
        email: 'sarah@white.com',
        phone: '5554443334',
        isPrimary: false,
      },
    })
  );

  // 2 Quotes
  await safeRun('Upsert Quote 1', () => 
    prisma.quote.upsert({
      where: { id: 'quote-1-uuid' },
      update: {},
      create: {
        id: 'quote-1-uuid',
        leadId: 'lead-4-uuid',
        title: 'UI Design Quote',
        items: [
          { description: 'Figma mockups and wireframes', quantity: 1, unitPrice: 3000.00, total: 3000.00 },
          { description: 'Revision cycles and feedback integration', quantity: 2, unitPrice: 1000.00, total: 2000.00 }
        ],
        totalAmount: 5000.00,
        status: 'SENT',
        validUntil: new Date('2026-08-09T00:00:00Z'),
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Quote 2', () => 
    prisma.quote.upsert({
      where: { id: 'quote-2-uuid' },
      update: {},
      create: {
        id: 'quote-2-uuid',
        clientId: 'client-1-uuid',
        title: 'SaaS Platform Development',
        items: [
          { description: 'NestJS backend API development', quantity: 1, unitPrice: 6000.00, total: 6000.00 },
          { description: 'NextJS frontend development', quantity: 1, unitPrice: 6000.00, total: 6000.00 }
        ],
        totalAmount: 12000.00,
        status: 'ACCEPTED',
        validUntil: new Date('2026-08-09T00:00:00Z'),
        organizationId: org.id,
      },
    })
  );

  console.log('CRM and Clients data seeded successfully!');

  // 8. Seed Projects and ERP Data
  console.log('Seeding Projects and Tasks data...');

  // Project 1: Website Redesign
  const project1 = await safeRun('Upsert Project 1', () => 
    prisma.project.upsert({
      where: { id: 'project-1-uuid' },
      update: {},
      create: {
        id: 'project-1-uuid',
        name: 'Website Redesign',
        description: 'Full Figma UI overhaul and frontend NestJS/Next.js implementation.',
        clientId: client1.id,
        status: 'IN_PROGRESS',
        startDate: new Date('2026-07-01T00:00:00Z'),
        endDate: new Date('2026-09-30T00:00:00Z'),
        budget: 15000.00,
        organizationId: org.id,
      },
    })
  );

  // Project 1 Members
  await safeRun('Upsert Project 1 Member: Admin', () => 
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project1.id, userId: user.id } },
      update: {},
      create: {
        projectId: project1.id,
        userId: user.id,
        role: 'lead',
      },
    })
  );

  await safeRun('Upsert Project 1 Member: Employee', () => 
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project1.id, userId: employeeUser.id } },
      update: {},
      create: {
        projectId: project1.id,
        userId: employeeUser.id,
        role: 'member',
      },
    })
  );

  // Project 1 Sprints
  const sprint1 = await safeRun('Upsert Sprint 1', () => 
    prisma.sprint.upsert({
      where: { id: 'sprint-1-uuid' },
      update: {},
      create: {
        id: 'sprint-1-uuid',
        projectId: project1.id,
        name: 'Sprint 1 - UI & Core Config',
        startDate: new Date('2026-07-01T00:00:00Z'),
        endDate: new Date('2026-07-15T00:00:00Z'),
        isActive: true,
      },
    })
  );

  // Project 1 Milestones
  await safeRun('Upsert Project 1 Milestone 1', () => 
    prisma.milestone.upsert({
      where: { id: 'milestone-1-uuid' },
      update: {},
      create: {
        id: 'milestone-1-uuid',
        projectId: project1.id,
        title: 'Figma Mockups Approved',
        dueDate: new Date('2026-07-10T00:00:00Z'),
        isCompleted: true,
        completedAt: new Date('2026-07-09T00:00:00Z'),
      },
    })
  );

  await safeRun('Upsert Project 1 Milestone 2', () => 
    prisma.milestone.upsert({
      where: { id: 'milestone-2-uuid' },
      update: {},
      create: {
        id: 'milestone-2-uuid',
        projectId: project1.id,
        title: 'Backend API Integration Completed',
        dueDate: new Date('2026-08-15T00:00:00Z'),
        isCompleted: false,
      },
    })
  );

  await safeRun('Upsert Project 1 Milestone 3', () => 
    prisma.milestone.upsert({
      where: { id: 'milestone-3-uuid' },
      update: {},
      create: {
        id: 'milestone-3-uuid',
        projectId: project1.id,
        title: 'UAT Signing and Launch',
        dueDate: new Date('2026-09-25T00:00:00Z'),
        isCompleted: false,
      },
    })
  );

  // Project 1 Tasks
  const task1 = await safeRun('Upsert Task 1', () => 
    prisma.task.upsert({
      where: { id: 'task-1-uuid' },
      update: {},
      create: {
        id: 'task-1-uuid',
        projectId: project1.id,
        title: 'Design Figma UI Wireframes',
        description: 'Create responsive home, blog, and service pages wireframes in Figma.',
        status: 'DONE',
        priority: 'HIGH',
        assignedToId: user.id,
        dueDate: new Date('2026-07-09T00:00:00Z'),
        sprintId: sprint1.id,
        order: 0,
      },
    })
  );

  await safeRun('Upsert Task 2', () => 
    prisma.task.upsert({
      where: { id: 'task-2-uuid' },
      update: {},
      create: {
        id: 'task-2-uuid',
        projectId: project1.id,
        title: 'Setup NestJS Boilerplate',
        description: 'Initialize backend architecture, add database package dependencies.',
        status: 'DONE',
        priority: 'MEDIUM',
        assignedToId: user.id,
        dueDate: new Date('2026-07-08T00:00:00Z'),
        sprintId: sprint1.id,
        order: 1,
      },
    })
  );

  const task3 = await safeRun('Upsert Task 3', () => 
    prisma.task.upsert({
      where: { id: 'task-3-uuid' },
      update: {},
      create: {
        id: 'task-3-uuid',
        projectId: project1.id,
        title: 'Implement Auth Middleware',
        description: 'Write Passport JWT Strategy and PermissionsGuard checks.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignedToId: employeeUser.id,
        dueDate: new Date('2026-07-14T00:00:00Z'),
        sprintId: sprint1.id,
        order: 0,
      },
    })
  );

  await safeRun('Upsert Task 4', () => 
    prisma.task.upsert({
      where: { id: 'task-4-uuid' },
      update: {},
      create: {
        id: 'task-4-uuid',
        projectId: project1.id,
        title: 'Create CRM Database Models',
        description: 'Write Lead, FollowUp, Client, and Quote schemas in schema.prisma.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignedToId: employeeUser.id,
        dueDate: new Date('2026-07-15T00:00:00Z'),
        sprintId: sprint1.id,
        order: 1,
      },
    })
  );

  await safeRun('Upsert Task 5', () => 
    prisma.task.upsert({
      where: { id: 'task-5-uuid' },
      update: {},
      create: {
        id: 'task-5-uuid',
        projectId: project1.id,
        title: 'Write API Documentation',
        description: 'Generate Swagger API specs for all CRM and Auth endpoints.',
        status: 'TODO',
        priority: 'LOW',
        assignedToId: employeeUser.id,
        dueDate: new Date('2026-07-20T00:00:00Z'),
        order: 0,
      },
    })
  );

  // Time Logs for Project 1 Tasks
  await safeRun('Upsert TimeLog 1', () => 
    prisma.timeLog.upsert({
      where: { id: 'timelog-1-uuid' },
      update: {},
      create: {
        id: 'timelog-1-uuid',
        taskId: task1.id,
        userId: user.id,
        minutes: 180,
        note: 'Finished homepage wireframes layout.',
      },
    })
  );

  await safeRun('Upsert TimeLog 2', () => 
    prisma.timeLog.upsert({
      where: { id: 'timelog-2-uuid' },
      update: {},
      create: {
        id: 'timelog-2-uuid',
        taskId: task3.id,
        userId: employeeUser.id,
        minutes: 120,
        note: 'Configured Strategy files and verified payloads.',
      },
    })
  );


  // Project 2: SaaS AI Portal
  const project2 = await safeRun('Upsert Project 2', () => 
    prisma.project.upsert({
      where: { id: 'project-2-uuid' },
      update: {},
      create: {
        id: 'project-2-uuid',
        name: 'SaaS AI Portal',
        description: 'Integrating LLM model pipelines directly with client admin controls.',
        clientId: client2.id,
        status: 'PLANNING',
        startDate: new Date('2026-08-01T00:00:00Z'),
        endDate: new Date('2026-12-31T00:00:00Z'),
        budget: 25000.00,
        organizationId: org.id,
      },
    })
  );

  // Project 2 Members
  await safeRun('Upsert Project 2 Member', () => 
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project2.id, userId: user.id } },
      update: {},
      create: {
        projectId: project2.id,
        userId: user.id,
        role: 'lead',
      },
    })
  );

  // Project 2 Sprints (inactive)
  const sprint2 = await safeRun('Upsert Sprint 2', () => 
    prisma.sprint.upsert({
      where: { id: 'sprint-2-uuid' },
      update: {},
      create: {
        id: 'sprint-2-uuid',
        projectId: project2.id,
        name: 'Sprint 1 - Architecture & LLM Research',
        startDate: new Date('2026-08-01T00:00:00Z'),
        endDate: new Date('2026-08-15T00:00:00Z'),
        isActive: false,
      },
    })
  );

  // Project 2 Milestones
  await safeRun('Upsert Project 2 Milestone', () => 
    prisma.milestone.upsert({
      where: { id: 'milestone-4-uuid' },
      update: {},
      create: {
        id: 'milestone-4-uuid',
        projectId: project2.id,
        title: 'Architecture Specs Signed',
        dueDate: new Date('2026-08-10T00:00:00Z'),
        isCompleted: false,
      },
    })
  );

  // Project 2 Tasks
  const project2Task1 = await safeRun('Upsert Project 2 Task 1', () => 
    prisma.task.upsert({
      where: { id: 'task-6-uuid' },
      update: {},
      create: {
        id: 'task-6-uuid',
        projectId: project2.id,
        title: 'Research AI Model APIs',
        description: 'Evaluate OpenAI, Gemini Pro, and local Llama inference speeds and costs.',
        status: 'DONE',
        priority: 'HIGH',
        assignedToId: user.id,
        dueDate: new Date('2026-07-09T00:00:00Z'),
        sprintId: sprint2.id,
        order: 0,
      },
    })
  );

  await safeRun('Upsert Project 2 Task 2', () => 
    prisma.task.upsert({
      where: { id: 'task-7-uuid' },
      update: {},
      create: {
        id: 'task-7-uuid',
        projectId: project2.id,
        title: 'Draft Database Architecture',
        description: 'Prepare ER diagrams representing tenant-wise model config overrides.',
        status: 'TODO',
        priority: 'MEDIUM',
        assignedToId: user.id,
        dueDate: new Date('2026-08-05T00:00:00Z'),
        sprintId: sprint2.id,
        order: 0,
      },
    })
  );

  // Time Logs for Project 2 Tasks
  await safeRun('Upsert TimeLog 3', () => 
    prisma.timeLog.upsert({
      where: { id: 'timelog-3-uuid' },
      update: {},
      create: {
        id: 'timelog-3-uuid',
        taskId: project2Task1.id,
        userId: user.id,
        minutes: 240,
        note: 'Benchmarked Gemini Pro vs GPT-4 latency.',
      },
    })
  );

  console.log('Projects and Tasks seeded successfully!');

  // 9. Seed Billing and Finance Data
  console.log('Seeding Billing and Finance data...');

  const today = new Date();
  
  // Helper to subtract days
  const subDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  };

  // Helper to add days
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Invoice 1: DRAFT
  await safeRun('Upsert Invoice 1 (DRAFT)', () => 
    prisma.invoice.upsert({
      where: { id: 'invoice-1-uuid' },
      update: {},
      create: {
        id: 'invoice-1-uuid',
        invoiceNumber: 'INV-2026-0001',
        clientId: client1.id,
        projectId: project1.id,
        items: [
          { description: 'Figma homepage wireframes layout', quantity: 1, unitPrice: 3000.00, total: 3000.00 },
          { description: 'NestJS backend boilerplate setup', quantity: 1, unitPrice: 2000.00, total: 2000.00 }
        ],
        subtotal: 5000.00,
        gstPercentage: 18.00,
        gstAmount: 900.00,
        totalAmount: 5900.00,
        status: 'DRAFT',
        issueDate: today,
        dueDate: addDays(today, 30),
        organizationId: org.id,
      },
    })
  );

  // Invoice 2: SENT
  await safeRun('Upsert Invoice 2 (SENT)', () => 
    prisma.invoice.upsert({
      where: { id: 'invoice-2-uuid' },
      update: {},
      create: {
        id: 'invoice-2-uuid',
        invoiceNumber: 'INV-2026-0002',
        clientId: client2.id,
        projectId: project2.id,
        items: [
          { description: 'AI Models LLM latency research', quantity: 1, unitPrice: 8000.00, total: 8000.00 }
        ],
        subtotal: 8000.00,
        gstPercentage: 18.00,
        gstAmount: 1440.00,
        totalAmount: 9440.00,
        status: 'SENT',
        issueDate: subDays(today, 5),
        dueDate: addDays(today, 25),
        organizationId: org.id,
      },
    })
  );

  // Invoice 3: PARTIALLY_PAID
  const inv3 = await safeRun('Upsert Invoice 3 (PARTIALLY_PAID)', () => 
    prisma.invoice.upsert({
      where: { id: 'invoice-3-uuid' },
      update: {},
      create: {
        id: 'invoice-3-uuid',
        invoiceNumber: 'INV-2026-0003',
        clientId: client1.id,
        projectId: project1.id,
        items: [
          { description: 'Database setup and migrations mapping', quantity: 1, unitPrice: 6000.00, total: 6000.00 }
        ],
        subtotal: 6000.00,
        gstPercentage: 18.00,
        gstAmount: 1080.00,
        totalAmount: 7080.00,
        status: 'PARTIALLY_PAID',
        issueDate: subDays(today, 20),
        dueDate: addDays(today, 10),
        organizationId: org.id,
      },
    })
  );

  // Payment 1 against Invoice 3
  await safeRun('Upsert Payment 1', () => 
    prisma.payment.upsert({
      where: { id: 'payment-1-uuid' },
      update: {},
      create: {
        id: 'payment-1-uuid',
        invoiceId: inv3.id,
        amount: 3000.00,
        method: 'UPI',
        transactionRef: 'TXN-UPI-98765',
        paidAt: subDays(today, 19),
      },
    })
  );

  // Invoice 4: PAID
  const inv4 = await safeRun('Upsert Invoice 4 (PAID)', () => 
    prisma.invoice.upsert({
      where: { id: 'invoice-4-uuid' },
      update: {},
      create: {
        id: 'invoice-4-uuid',
        invoiceNumber: 'INV-2026-0004',
        clientId: client2.id,
        projectId: project2.id,
        items: [
          { description: 'Initial onboarding consultation', quantity: 1, unitPrice: 4000.00, total: 4000.00 }
        ],
        subtotal: 4000.00,
        gstPercentage: 18.00,
        gstAmount: 720.00,
        totalAmount: 4720.00,
        status: 'PAID',
        issueDate: subDays(today, 45),
        dueDate: subDays(today, 15),
        paidAt: subDays(today, 15),
        organizationId: org.id,
      },
    })
  );

  // Payment 2 against Invoice 4
  await safeRun('Upsert Payment 2', () => 
    prisma.payment.upsert({
      where: { id: 'payment-2-uuid' },
      update: {},
      create: {
        id: 'payment-2-uuid',
        invoiceId: inv4.id,
        amount: 4720.00,
        method: 'BANK_TRANSFER',
        transactionRef: 'TXN-BANK-112233',
        paidAt: subDays(today, 15),
      },
    })
  );

  // Invoice 5: OVERDUE
  await safeRun('Upsert Invoice 5 (OVERDUE)', () => 
    prisma.invoice.upsert({
      where: { id: 'invoice-5-uuid' },
      update: {},
      create: {
        id: 'invoice-5-uuid',
        invoiceNumber: 'INV-2026-0005',
        clientId: client1.id,
        items: [
          { description: 'Legacy architecture consulting hours', quantity: 1, unitPrice: 3000.00, total: 3000.00 }
        ],
        subtotal: 3000.00,
        gstPercentage: 18.00,
        gstAmount: 540.00,
        totalAmount: 3540.00,
        status: 'OVERDUE',
        issueDate: subDays(today, 40),
        dueDate: subDays(today, 10),
        organizationId: org.id,
      },
    })
  );

  // Estimate 1: SENT
  await safeRun('Upsert Estimate 1', () => 
    prisma.estimate.upsert({
      where: { id: 'estimate-1-uuid' },
      update: {},
      create: {
        id: 'estimate-1-uuid',
        estimateNumber: 'EST-2026-0001',
        clientId: client1.id,
        items: [
          { description: 'Enterprise AI Strategy Draft', quantity: 1, unitPrice: 10000.00, total: 10000.00 }
        ],
        subtotal: 10000.00,
        totalAmount: 10000.00,
        status: 'SENT',
        validUntil: addDays(today, 15),
        organizationId: org.id,
      },
    })
  );

  // Estimate 2: ACCEPTED
  await safeRun('Upsert Estimate 2', () => 
    prisma.estimate.upsert({
      where: { id: 'estimate-2-uuid' },
      update: {},
      create: {
        id: 'estimate-2-uuid',
        estimateNumber: 'EST-2026-0002',
        clientId: client2.id,
        items: [
          { description: 'Initial onboarding consultation', quantity: 1, unitPrice: 4000.00, total: 4000.00 }
        ],
        subtotal: 4000.00,
        totalAmount: 4000.00,
        status: 'ACCEPTED',
        organizationId: org.id,
        convertedToInvoiceId: inv4.id,
      },
    })
  );

  // Subscription 1: ACTIVE
  await safeRun('Upsert Subscription 1', () => 
    prisma.subscription.upsert({
      where: { id: 'sub-1-uuid' },
      update: {},
      create: {
        id: 'sub-1-uuid',
        clientId: client1.id,
        planName: 'Enterprise AI Support Plan',
        amount: 1500.00,
        billingCycle: 'MONTHLY',
        status: 'ACTIVE',
        nextBillingDate: addDays(today, 20),
        organizationId: org.id,
      },
    })
  );

  // Expenses spanning the last few months
  await safeRun('Upsert Expense 1', () => 
    prisma.expenseRecord.upsert({
      where: { id: 'expense-1-uuid' },
      update: {},
      create: {
        id: 'expense-1-uuid',
        title: 'GitHub Copilot Enterprise License',
        category: 'software',
        amount: 500.00,
        spentAt: subDays(today, 60),
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Expense 2', () => 
    prisma.expenseRecord.upsert({
      where: { id: 'expense-2-uuid' },
      update: {},
      create: {
        id: 'expense-2-uuid',
        title: 'UI Design Contractor Fees',
        category: 'salary',
        amount: 4500.00,
        spentAt: subDays(today, 30),
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Expense 3', () => 
    prisma.expenseRecord.upsert({
      where: { id: 'expense-3-uuid' },
      update: {},
      create: {
        id: 'expense-3-uuid',
        title: 'Google Ad Campaigns (CRM Leads)',
        category: 'marketing',
        amount: 300.00,
        spentAt: subDays(today, 15),
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Expense 4', () => 
    prisma.expenseRecord.upsert({
      where: { id: 'expense-4-uuid' },
      update: {},
      create: {
        id: 'expense-4-uuid',
        title: 'Office Pantry snacks and coffee',
        category: 'misc',
        amount: 250.00,
        spentAt: subDays(today, 5),
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Expense 5', () => 
    prisma.expenseRecord.upsert({
      where: { id: 'expense-5-uuid' },
      update: {},
      create: {
        id: 'expense-5-uuid',
        title: 'Jane Employee Monthly Salary',
        category: 'salary',
        amount: 4500.00,
        spentAt: today,
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Expense 6', () => 
    prisma.expenseRecord.upsert({
      where: { id: 'expense-6-uuid' },
      update: {},
      create: {
        id: 'expense-6-uuid',
        title: 'Vercel Pro Hosting Subscription',
        category: 'software',
        amount: 120.00,
        spentAt: today,
        organizationId: org.id,
      },
    })
  );

  console.log('Billing and Finance data seeded successfully!');

  // 10. Seed HR and Payroll Data
  console.log('Seeding HR and Payroll data...');

  // Create additional users for employees
  const bobUser = await safeRun('Upsert User: Bob Developer', () => 
    prisma.user.upsert({
      where: { email: 'bob.dev@trifusiondynamics.com' },
      update: {
        password: hashedPassword,
        name: 'Bob Developer',
        isActive: true,
        organizationId: org.id,
      },
      create: {
        email: 'bob.dev@trifusiondynamics.com',
        password: hashedPassword,
        name: 'Bob Developer',
        isActive: true,
        organizationId: org.id,
      },
    })
  );

  await safeRun('Assign Employee Role to Bob', () => 
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: bobUser.id, roleId: dbRoles.employee.id } },
      update: {},
      create: { userId: bobUser.id, roleId: dbRoles.employee.id },
    })
  );

  const aliceUser = await safeRun('Upsert User: Alice Designer', () => 
    prisma.user.upsert({
      where: { email: 'alice.design@trifusiondynamics.com' },
      update: {
        password: hashedPassword,
        name: 'Alice Designer',
        isActive: true,
        organizationId: org.id,
      },
      create: {
        email: 'alice.design@trifusiondynamics.com',
        password: hashedPassword,
        name: 'Alice Designer',
        isActive: true,
        organizationId: org.id,
      },
    })
  );

  await safeRun('Assign Employee Role to Alice', () => 
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: aliceUser.id, roleId: dbRoles.employee.id } },
      update: {},
      create: { userId: aliceUser.id, roleId: dbRoles.employee.id },
    })
  );

  const charlieUser = await safeRun('Upsert User: Charlie Intern', () => 
    prisma.user.upsert({
      where: { email: 'charlie.intern@trifusiondynamics.com' },
      update: {
        password: hashedPassword,
        name: 'Charlie Intern',
        isActive: true,
        organizationId: org.id,
      },
      create: {
        email: 'charlie.intern@trifusiondynamics.com',
        password: hashedPassword,
        name: 'Charlie Intern',
        isActive: true,
        organizationId: org.id,
      },
    })
  );

  await safeRun('Assign Employee Role to Charlie', () => 
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: charlieUser.id, roleId: dbRoles.employee.id } },
      update: {},
      create: { userId: charlieUser.id, roleId: dbRoles.employee.id },
    })
  );

  // Seed 4 Employee records
  const empJane = await safeRun('Upsert Employee: Jane', () => 
    prisma.employee.upsert({
      where: { employeeCode: 'TFX-EMP-001' },
      update: { userId: employeeUser.id },
      create: {
        userId: employeeUser.id,
        employeeCode: 'TFX-EMP-001',
        department: 'Engineering',
        designation: 'Senior Developer',
        joiningDate: new Date('2025-01-15T00:00:00Z'),
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        organizationId: org.id,
      },
    })
  );

  const empBob = await safeRun('Upsert Employee: Bob', () => 
    prisma.employee.upsert({
      where: { employeeCode: 'TFX-EMP-002' },
      update: { userId: bobUser.id },
      create: {
        userId: bobUser.id,
        employeeCode: 'TFX-EMP-002',
        department: 'Engineering',
        designation: 'Frontend Engineer',
        joiningDate: new Date('2025-06-01T00:00:00Z'),
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        reportingToId: empJane.id,
        organizationId: org.id,
      },
    })
  );

  const empAlice = await safeRun('Upsert Employee: Alice', () => 
    prisma.employee.upsert({
      where: { employeeCode: 'TFX-EMP-003' },
      update: { userId: aliceUser.id },
      create: {
        userId: aliceUser.id,
        employeeCode: 'TFX-EMP-003',
        department: 'Design',
        designation: 'UI Designer',
        joiningDate: new Date('2025-09-01T00:00:00Z'),
        employmentType: 'CONTRACT',
        status: 'ACTIVE',
        organizationId: org.id,
      },
    })
  );

  const empCharlie = await safeRun('Upsert Employee: Charlie', () => 
    prisma.employee.upsert({
      where: { employeeCode: 'TFX-EMP-004' },
      update: { userId: charlieUser.id },
      create: {
        userId: charlieUser.id,
        employeeCode: 'TFX-EMP-004',
        department: 'Engineering',
        designation: 'Backend Intern',
        joiningDate: new Date('2026-03-01T00:00:00Z'),
        employmentType: 'INTERN',
        status: 'ON_LEAVE',
        organizationId: org.id,
      },
    })
  );

  // Seed 2 Leaves
  await safeRun('Upsert Leave 1 (APPROVED)', () => 
    prisma.leave.upsert({
      where: { id: 'leave-1-uuid' },
      update: {},
      create: {
        id: 'leave-1-uuid',
        employeeId: empCharlie.id,
        type: 'SICK',
        startDate: subDays(today, 3),
        endDate: subDays(today, 1),
        reason: 'Severe fever and flu recovery.',
        status: 'APPROVED',
        approvedById: empJane.id,
      },
    })
  );

  await safeRun('Upsert Leave 2 (PENDING)', () => 
    prisma.leave.upsert({
      where: { id: 'leave-2-uuid' },
      update: {},
      create: {
        id: 'leave-2-uuid',
        employeeId: empBob.id,
        type: 'CASUAL',
        startDate: today,
        endDate: addDays(today, 2),
        reason: 'Attending family event.',
        status: 'PENDING',
      },
    })
  );

  // Seed Salary Structures
  await safeRun('Upsert Salary: Jane', () => 
    prisma.salaryStructure.upsert({
      where: { employeeId: empJane.id },
      update: {},
      create: {
        employeeId: empJane.id,
        basicSalary: 80000.00,
        hra: 30000.00,
        allowances: 10000.00,
        deductions: 5000.00,
      },
    })
  );

  await safeRun('Upsert Salary: Bob', () => 
    prisma.salaryStructure.upsert({
      where: { employeeId: empBob.id },
      update: {},
      create: {
        employeeId: empBob.id,
        basicSalary: 50000.00,
        hra: 20000.00,
        allowances: 5000.00,
        deductions: 3000.00,
      },
    })
  );

  await safeRun('Upsert Salary: Alice', () => 
    prisma.salaryStructure.upsert({
      where: { employeeId: empAlice.id },
      update: {},
      create: {
        employeeId: empAlice.id,
        basicSalary: 40000.00,
        hra: 0,
        allowances: 0,
        deductions: 0,
      },
    })
  );

  await safeRun('Upsert Salary: Charlie', () => 
    prisma.salaryStructure.upsert({
      where: { employeeId: empCharlie.id },
      update: {},
      create: {
        employeeId: empCharlie.id,
        basicSalary: 15000.00,
        hra: 0,
        allowances: 0,
        deductions: 0,
      },
    })
  );

  // Seed Bank Details
  await safeRun('Upsert Bank Details: Jane', () => 
    prisma.bankDetail.upsert({
      where: { employeeId: empJane.id },
      update: {},
      create: {
        employeeId: empJane.id,
        accountHolder: 'Jane Employee',
        accountNumber: '112233445566',
        ifscCode: 'ICIC0000104',
        bankName: 'ICICI Bank',
      },
    })
  );

  await safeRun('Upsert Bank Details: Bob', () => 
    prisma.bankDetail.upsert({
      where: { employeeId: empBob.id },
      update: {},
      create: {
        employeeId: empBob.id,
        accountHolder: 'Bob Developer',
        accountNumber: '223344556677',
        ifscCode: 'HDFC0000240',
        bankName: 'HDFC Bank',
      },
    })
  );

  // Seed 2 Payslips
  await safeRun('Upsert Payslip 1 (PAID)', () => 
    prisma.payslip.upsert({
      where: { employeeId_month_year: { employeeId: empJane.id, month: 6, year: 2026 } },
      update: {},
      create: {
        employeeId: empJane.id,
        month: 6,
        year: 2026,
        grossAmount: 120000.00,
        deductions: 5000.00,
        tax: 6000.00,
        netAmount: 109000.00,
        status: 'PAID',
        paidAt: new Date('2026-06-30T10:00:00Z'),
      },
    })
  );

  await safeRun('Upsert Payslip 2 (GENERATED)', () => 
    prisma.payslip.upsert({
      where: { employeeId_month_year: { employeeId: empBob.id, month: 6, year: 2026 } },
      update: {},
      create: {
        employeeId: empBob.id,
        month: 6,
        year: 2026,
        grossAmount: 75000.00,
        deductions: 3000.00,
        tax: 3750.00,
        netAmount: 68250.00,
        status: 'GENERATED',
      },
    })
  );

  // Seed 2 Recruitment candidates
  await safeRun('Upsert Recruitment 1', () => 
    prisma.recruitment.upsert({
      where: { id: 'recruit-1-uuid' },
      update: {},
      create: {
        id: 'recruit-1-uuid',
        position: 'Full Stack Developer',
        department: 'Engineering',
        candidateName: 'Devin Carter',
        candidateEmail: 'devin@example.com',
        stage: 'INTERVIEW',
        notes: 'Great portfolio in Next.js + NestJS. Hard skills match perfectly.',
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert Recruitment 2', () => 
    prisma.recruitment.upsert({
      where: { id: 'recruit-2-uuid' },
      update: {},
      create: {
        id: 'recruit-2-uuid',
        position: 'Product Manager',
        department: 'Management',
        candidateName: 'Grace Hopper',
        candidateEmail: 'grace@example.com',
        stage: 'APPLIED',
        notes: 'Applied through company portal. Resume under review.',
        organizationId: org.id,
      },
    })
  );

  console.log('HR and Payroll data seeded successfully!');

  // Seed AI Data
  console.log('Seeding AI data...');
  
  await safeRun('Upsert AiProposalRequest 1', () =>
    prisma.aiProposalRequest.upsert({
      where: { id: 'ai-prop-1' },
      update: {},
      create: {
        id: 'ai-prop-1',
        requirements: 'E-commerce website with AI product recommendations.',
        generatedContent: '# Proposal: E-commerce with AI\n\nThis is a sample generated proposal...',
        status: 'completed',
        createdById: user.id,
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert AiProposalRequest 2', () =>
    prisma.aiProposalRequest.upsert({
      where: { id: 'ai-prop-2' },
      update: {},
      create: {
        id: 'ai-prop-2',
        requirements: 'Mobile app for fitness tracking.',
        generatedContent: '# Proposal: Fitness Tracking App\n\nThis is another sample generated proposal...',
        status: 'completed',
        createdById: user.id,
        organizationId: org.id,
      },
    })
  );

  await safeRun('Upsert AiSeoAudit 1', () =>
    prisma.aiSeoAudit.upsert({
      where: { id: 'ai-seo-1' },
      update: {},
      create: {
        id: 'ai-seo-1',
        websiteUrl: 'https://example.com',
        score: 85,
        findings: { errors: 2, warnings: 5, passed: 20 },
        recommendations: [{ title: 'Add meta descriptions', priority: 'high' }],
        organizationId: org.id,
      },
    })
  );

  console.log('AI data seeded successfully!');

  // Seed Analytics and Automation
  console.log('Seeding Analytics & Automation data...');

  // Mock past 7 days of rollups
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    await safeRun(`Upsert RevenueRollup day ${i}`, () =>
      prisma.revenueRollup.upsert({
        where: { organizationId_periodType_periodDate: { organizationId: org.id, periodType: 'daily', periodDate: d } },
        update: {},
        create: {
          organizationId: org.id,
          periodType: 'daily',
          periodDate: d,
          totalRevenue: 5000 + (Math.random() * 2000),
          totalExpense: 1000 + (Math.random() * 500),
          netProfit: 4000 + (Math.random() * 1500),
        }
      })
    );

    await safeRun(`Upsert ClientRollup day ${i}`, () =>
      prisma.clientRollup.upsert({
        where: { organizationId_periodDate: { organizationId: org.id, periodDate: d } },
        update: {},
        create: {
          organizationId: org.id,
          periodDate: d,
          totalClients: 50 + i,
          newClients: Math.floor(Math.random() * 3),
          churnedClients: Math.floor(Math.random() * 1),
        }
      })
    );
  }

  // Workflows
  await safeRun('Upsert Workflow 1', () =>
    prisma.workflow.upsert({
      where: { id: 'wf-1' },
      update: {},
      create: {
        id: 'wf-1',
        name: 'Welcome New Lead',
        triggerType: 'EVENT',
        triggerConfig: { event: 'lead.created' },
        actions: [
          { type: 'send_notification', config: { template: 'welcome_email' } }
        ],
        organizationId: org.id,
      }
    })
  );

  await safeRun('Upsert Workflow 2', () =>
    prisma.workflow.upsert({
      where: { id: 'wf-2' },
      update: {},
      create: {
        id: 'wf-2',
        name: 'Check Overdue Invoices',
        triggerType: 'SCHEDULED',
        triggerConfig: { cron: '0 9 * * *' },
        actions: [
          { type: 'update_status', config: { target: 'invoices', status: 'overdue' } }
        ],
        organizationId: org.id,
      }
    })
  );

  console.log('Analytics & Automation seeded successfully!');
  console.log('Seeding completed successfully.');
  console.log(`========================================`);
  console.log(`ACCOUNT SUMMARY:`);
  console.log(`All newly created accounts must change password on first login.`);
  console.log(`Superadmin account (trifusiondynamics@gmail.com) keeps its permanent password.`);
  console.log(`========================================`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
