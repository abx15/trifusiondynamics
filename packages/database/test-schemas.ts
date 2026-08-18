import { PrismaClient } from '@prisma/client';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn(err);
}

// Connect to neondb database directly using IP + endpoint option
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_eJYdr40UaXjg@54.147.180.180/neondb?sslmode=require&options=project%3Dep-rough-brook-at80fqp7"
    }
  }
});

async function main() {
  console.log('Connecting to neondb database...');
  try {
    console.log('Attempting to drop schema auth cascade...');
    await prisma.$executeRawUnsafe(`
      DROP SCHEMA IF EXISTS auth CASCADE;
    `);
    console.log('Successfully dropped schema auth!');

    console.log('Attempting to recreate schema auth...');
    await prisma.$executeRawUnsafe(`
      CREATE SCHEMA auth;
    `);
    console.log('Successfully recreated schema auth!');
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
