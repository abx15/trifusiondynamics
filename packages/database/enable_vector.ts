import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
  console.log('Vector extension enabled.');
}
main().finally(() => prisma.$disconnect());
