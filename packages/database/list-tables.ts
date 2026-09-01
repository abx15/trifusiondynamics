import { PrismaClient } from '@prisma/client';
import dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from database package directory
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
  console.log('Connecting to neondb...');
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('auth', 'cms', 'public')
    `;
    console.log('Tables:', tables);
  } catch (err: any) {
    console.error('Error listing tables:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
