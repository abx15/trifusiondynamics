import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import dns from 'dns';

dotenv.config({ path: path.resolve(__dirname, './.env') });

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn(err);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });
  for (const r of roles) {
    console.log('ROLE:', r.name);
    console.log('PERMS:', r.permissions.map((p) => p.permission.action).join(', '));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
