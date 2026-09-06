const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Connecting to database...');
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log(`Found ${users.length} users in database:`);
    for (const u of users) {
      const roles = u.roles.map(r => r.role.name).join(', ');
      const isDefaultPass = await bcrypt.compare('trifusiondynamicsA3web', u.password);
      const isEnvAdminPass = process.env.ADMIN_PASSWORD ? await bcrypt.compare(process.env.ADMIN_PASSWORD, u.password) : false;
      const isEnvTempPass = process.env.DEFAULT_TEMP_PASSWORD ? await bcrypt.compare(process.env.DEFAULT_TEMP_PASSWORD, u.password) : false;
      
      console.log(`- Email: "${u.email}" | Active: ${u.isActive} | Roles: [${roles}] | Pass Match: default(trifusiondynamicsA3web)=${isDefaultPass}, ADMIN_PASSWORD=${isEnvAdminPass}, TEMP_PASSWORD=${isEnvTempPass}`);
    }
  } catch (err) {
    console.error('Error connecting/querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
