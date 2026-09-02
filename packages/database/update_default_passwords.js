const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });

if (process.env.NODE_ENV === 'production') {
  console.error('ABORT: update_default_passwords.js contains seed credentials and must not run in production.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

const DEFAULT_PASSWORD = 'trifusiondynamicsA3web';

const targetEmails = [
  'trifusiondynamics@gmail.com',
  'admin@trifusiondynamics.com',
  'sales.trifusion@gmail.com',
  'support.trifusion@gmail.com',
  'hr.trifusion@gmail.com',
  'agent@trifusiondynamics.com',
  'bob.dev@trifusiondynamics.com',
  'client@apexretail.com',
];

async function updateAllPasswords() {
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  console.log(`Hashing password with bcrypt (cost factor 12)...`);

  let updated = 0;
  for (const email of targetEmails) {
    const result = await prisma.user.updateMany({
      where: { email },
      data: { password: hashed, mustChangePassword: false },
    });
    if (result.count > 0) {
      console.log(`✅ Updated password for ${email}`);
      updated++;
    } else {
      console.log(`❌ User not found: ${email}`);
    }
  }

  console.log(`\n================================`);
  console.log(`Updated ${updated}/${targetEmails.length} accounts with password: ${DEFAULT_PASSWORD}`);
  console.log(`================================`);
  await prisma.$disconnect();
}

updateAllPasswords();
