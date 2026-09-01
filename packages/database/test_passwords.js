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

const accountsToTest = [
  { email: 'trifusiondynamics@gmail.com', pass: 'trifusiondynamicsA3web', expectedRole: 'super_admin' },
  { email: 'admin@trifusiondynamics.com', pass: 'ChangeThisPassword123!', expectedRole: 'admin' },
  { email: 'sales.trifusion@gmail.com', pass: 'Welcome@123', expectedRole: 'sales_agent' },
  { email: 'support.trifusion@gmail.com', pass: 'Welcome@123', expectedRole: 'support_agent' },
  { email: 'hr.trifusion@gmail.com', pass: 'Welcome@123', expectedRole: 'hr_agent' },
  { email: 'agent@trifusiondynamics.com', pass: 'Agent@123', expectedRole: 'agent' },
  { email: 'bob.dev@trifusiondynamics.com', pass: 'Welcome@123', expectedRole: 'employee' },
  { email: 'client@apexretail.com', pass: 'Client@123', expectedRole: 'client' },
];

async function testAuth() {
  for (const acc of accountsToTest) {
    const user = await prisma.user.findFirst({
      where: { email: acc.email },
      include: { roles: { include: { role: true } } }
    });
    if (!user) {
      console.log(`❌ ${acc.email} NOT FOUND`);
      continue;
    }
    const isPassOk = await bcrypt.compare(acc.pass, user.password);
    console.log(`${isPassOk ? '✅' : '❌'} ${acc.email} | Pass Valid: ${isPassOk} | mustChangePass: ${user.mustChangePassword} | Roles:`, user.roles.map(r => r.role.name));
  }
  await prisma.$disconnect();
}
testAuth();
