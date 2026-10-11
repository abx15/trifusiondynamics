import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, './.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      roles: true,
      organizationId: true,
      clientContacts: {
        include: {
          client: {
            include: {
              projects: true,
            },
          },
        },
      },
    },
  });
  console.log('USERS_RESULT:' + JSON.stringify(users, null, 2));

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      clientId: true,
      organizationId: true,
    },
  });
  console.log('PROJECTS_RESULT:' + JSON.stringify(projects, null, 2));

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });
  console.log('CLIENTS_RESULT:' + JSON.stringify(clients, null, 2));

  const tickets = await prisma.ticket.findMany({
    take: 5,
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      clientId: true,
      projectId: true,
      requesterId: true,
    },
  });
  console.log('TICKETS_RESULT:' + JSON.stringify(tickets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
