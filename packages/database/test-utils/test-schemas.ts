import { PrismaClient } from '@prisma/client';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn(err);
}

// SAFETY: This script drops the `auth` schema and is DESTRUCTIVE.
// It must only run against a non-production database.
if (
  process.env.NODE_ENV === 'production' ||
  process.env.ALLOW_DESTRUCTIVE_SCHEMA_TEST !== 'true'
) {
  console.error(
    'ABORT: test-schemas.ts will not run in production.\n' +
      'Set ALLOW_DESTRUCTIVE_SCHEMA_TEST=true to override (use a test/dev DB only).',
  );
  process.exit(1);
}

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL must be set');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log('Connecting to database...');
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
