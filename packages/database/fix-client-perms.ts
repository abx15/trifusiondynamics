import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import dns from 'dns';

dotenv.config({ path: './.env' });
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch(e) {}

const prisma = new PrismaClient();

async function main() {
  console.log('1. Upserting permissions for client and employee...');
  const permissions = [
    'helpdesk:read',
    'helpdesk:write',
    'helpdesk:submit_resolution',
    'projects:read',
    'projects:write',
    'clients:read',
    'clients:write',
    'billing:read',
  ];

  const dbPerms: Record<string, any> = {};
  for (const action of permissions) {
    const p = await prisma.permission.upsert({
      where: { action },
      update: {},
      create: { action },
    });
    dbPerms[action] = p;
  }

  const clientRole = await prisma.role.findUnique({ where: { name: 'client' } });
  const employeeRole = await prisma.role.findUnique({ where: { name: 'employee' } });

  if (clientRole) {
    const clientActions = ['helpdesk:read', 'helpdesk:write', 'projects:read', 'billing:read'];
    for (const a of clientActions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: clientRole.id,
            permissionId: dbPerms[a].id,
          },
        },
        update: {},
        create: {
          roleId: clientRole.id,
          permissionId: dbPerms[a].id,
        },
      });
      console.log(`Assigned ${a} to client role`);
    }
  }

  if (employeeRole) {
    const empActions = ['helpdesk:read', 'helpdesk:write', 'helpdesk:submit_resolution', 'projects:read'];
    for (const a of empActions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: employeeRole.id,
            permissionId: dbPerms[a].id,
          },
        },
        update: {},
        create: {
          roleId: employeeRole.id,
          permissionId: dbPerms[a].id,
        },
      });
      console.log(`Assigned ${a} to employee role`);
    }
  }

  console.log('2. Linking client user to Client record...');
  // Find or create Client for Apex Retail
  let client = await prisma.client.findFirst({
    where: { email: 'client@apexretail.com' },
  });

  if (!client) {
    // Check if Charlie Green exists
    client = await prisma.client.findFirst();
  }

  console.log('Found client record:', client?.id, client?.name);

  // Update user client@apexretail.com
  const updatedUser = await prisma.user.update({
    where: { email: 'client@apexretail.com' },
    data: {
      linkedClientId: client?.id,
    },
  });
  console.log('Updated user linkedClientId:', updatedUser.linkedClientId);

  // Check projects for this client
  const projects = await prisma.project.findMany({
    where: { clientId: client?.id },
  });
  console.log(`Client ${client?.name} has ${projects.length} projects`);
  if (projects.length === 0 && client) {
    console.log('Creating a project for this client...');
    const newProj = await prisma.project.create({
      data: {
        name: 'Apex E-Commerce Modernization',
        description: 'Next.js storefront & headless Shopify integration with high-availability support.',
        clientId: client.id,
        organizationId: client.organizationId,
        status: 'IN_PROGRESS',
        budget: '25000',
      },
    });
    console.log('Created project:', newProj.id, newProj.name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

