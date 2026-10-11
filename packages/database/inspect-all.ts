import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import dns from 'dns';

dotenv.config({ path: './.env' });
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch(e) {}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      linkedClientId: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });
  console.log('ALL USERS:', JSON.stringify(users, null, 2));

  const employees = await prisma.employee.findMany({
    include: {
      user: { select: { email: true, name: true } },
      department: true,
    },
  });
  console.log('ALL EMPLOYEES:', JSON.stringify(employees, null, 2));

  const departments = await prisma.department.findMany();
  console.log('ALL DEPARTMENTS:', JSON.stringify(departments, null, 2));

  const projects = await prisma.project.findMany();
  console.log('ALL PROJECTS:', JSON.stringify(projects, null, 2));

  const tickets = await prisma.ticket.findMany();
  console.log('ALL TICKETS COUNT:', tickets.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());

