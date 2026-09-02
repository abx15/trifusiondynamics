const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });

// SAFETY: This script tests hardcoded credentials against the database.
// Guard against accidental production use.
if (process.env.NODE_ENV === 'production') {
  console.error('ABORT: test_passwords.js contains test credentials and must not run in production.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

const DEFAULT_PASSWORD = 'trifusiondynamicsA3web';

const accountsToTest = [
  { email: 'trifusiondynamics@gmail.com', expectedRole: 'super_admin' },
  { email: 'admin@trifusiondynamics.com', expectedRole: 'admin' },
  { email: 'sales.trifusion@gmail.com', expectedRole: 'sales_agent' },
  { email: 'support.trifusion@gmail.com', expectedRole: 'support_agent' },
  { email: 'hr.trifusion@gmail.com', expectedRole: 'hr_agent' },
  { email: 'agent@trifusiondynamics.com', expectedRole: 'agent' },
  { email: 'bob.dev@trifusiondynamics.com', expectedRole: 'employee' },
  { email: 'client@apexretail.com', expectedRole: 'client' },
];

async function testAuth() {
  console.log(`Testing all accounts with default password: ${DEFAULT_PASSWORD}\n`);
  let passCount = 0;

  for (const acc of accountsToTest) {
    const user = await prisma.user.findFirst({
      where: { email: acc.email },
      include: { roles: { include: { role: true } } }
    });
    if (!user) {
      console.log(`❌ ${acc.email} NOT FOUND`);
      continue;
    }
    const isPassOk = await bcrypt.compare(DEFAULT_PASSWORD, user.password);
    console.log(`${isPassOk ? '✅' : '❌'} ${acc.email} | Pass Valid: ${isPassOk} | mustChangePass: ${user.mustChangePassword} | Roles:`, user.roles.map(r => r.role.name));
    if (isPassOk) passCount++;
  }
  console.log(`\n================================`);
  console.log(`Results: ${passCount}/${accountsToTest.length} passwords valid!`);
  console.log(`================================`);
  await prisma.$disconnect();
}
testAuth();
