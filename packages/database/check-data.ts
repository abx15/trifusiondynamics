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
      linkedClientId: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
  console.log('USERS:', JSON.stringify(users, null, 2));

  const clients = await prisma.client.findMany();
  console.log('CLIENTS:', JSON.stringify(clients, null, 2));

  const projects = await prisma.project.findMany();
  console.log('PROJECTS:', JSON.stringify(projects, null, 2));

  const tickets = await prisma.ticket.findMany();
  console.log('TICKETS_COUNT:', tickets.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());

