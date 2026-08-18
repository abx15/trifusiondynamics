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

// Connect to neondb database (using the original user URL)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_eJYdr40UaXjg@ep-rough-brook-at80fqp7-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  console.log('Connecting to neondb...');
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('auth', 'cms', 'public');
    `);
    console.log('Tables:', tables);
  } catch (err: any) {
    console.error('Error listing tables:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
