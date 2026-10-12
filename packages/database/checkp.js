const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function c() {
  const r = await p.role.findUnique({ where: { name: 'admin' }, include: { permissions: { include: { permission: true } } } });
  console.log('Role perms:', r.permissions.map(x => x.permission.action).sort().join(', '));
  const u = await p.user.findFirst({ where: { email: 'admin@trifusiondynamics.com' } });
  const ur = await p.userRole.findMany({ where: { userId: u.id }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  const perms = [...new Set(ur.flatMap(x => x.role.permissions.map(y => y.permission.action)))].sort();
  console.log('User perms:', perms.join(', '));
}

c().finally(() => p.$disconnect());