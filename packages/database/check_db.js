const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../../.env' });
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } }
});
async function check() {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: { role: true }
        }
      }
    });
    console.log('Total users:', users.length);
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
