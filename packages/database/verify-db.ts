import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });
    console.log('Users in database:', users.length);
    console.log('User details:', JSON.stringify(users.map(u => ({
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      roles: u.roles.map(ur => ur.role.name)
    })), null, 2));
    
    const roles = await prisma.role.findMany();
    console.log('Roles in database:', roles.length);
    console.log('Role details:', JSON.stringify(roles.map(r => r.name), null, 2));
    
    const permissions = await prisma.permission.findMany();
    console.log('Permissions in database:', permissions.length);
    
  } catch (error) {
    console.error('Error verifying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();