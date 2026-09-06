const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });

// SAFETY: This diagnostic script queries all users without pagination.
// Guard against accidental production use.
if (process.env.NODE_ENV === 'production') {
  console.error('ABORT: check_db.js is a diagnostic script and must not run in production.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});
async function check() {
  try {
    // Bounded fetch: diagnostic script, cap at 100 to prevent memory issues
    const users = await prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      take: 100,
    });
    console.log('Total users (capped at 100):', users.length);
    for (const u of users) {
      console.log(u.email, 'isActive:', u.isActive, 'mustChangePass:', u.mustChangePassword, 'roles:', u.roles.map(r => r.role.name));
    }
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
