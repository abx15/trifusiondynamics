const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminPerms() {
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) return;

  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId: adminRole.id },
    include: { permission: true }
  });
  console.log('Admin role permissions:', rolePerms.map(rp => rp.permission.action).sort().join(', '));
  
  const user = await prisma.user.findFirst({ where: { email: 'admin@trifusiondynamics.com' } });
  const userRoles = await prisma.userRole.findMany({ 
    where: { userId: user.id }, 
    include: { role: { include: { permissions: { include: { permission: true } } } } 
  });
  console.log('\nUser roles:', userRoles.map(ur => ur.role.name));
  const perms = [...new Set(userRoles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.action)))].sort();
  console.log('User effective permissions:', perms.join(', '));
}

checkAdminPerms().finally(() => prisma.$disconnect());