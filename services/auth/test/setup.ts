import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  // Use the test database
  process.env.MONGODB_URI = 'mongodb://localhost:27017/trifusion_test';
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/trifusion_test';

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Reset database schema and run migrations
  console.log('Resetting test database...');
  execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'ignore' });

  // Seed test fixtures
  const org = await prisma.organization.create({
    data: {
      name: 'Test Org',
      slug: 'test-org',
    },
  });

  // Note: For integration tests, we just need basic users.
  // The auth-helper will generate JWTs directly using standard JWT tools for tests,
  // or we can invoke the login endpoint.
  // Let's create fixtures:
  // (Admin, Employee, Client)

  await prisma.user.createMany({
    data: [
      {
        id: 'admin-user-id',
        email: 'admin@test.com',
        password: 'hashed-password',
        name: 'Admin Test',
        organizationId: org.id,
      },
      {
        id: 'employee-user-id',
        email: 'employee@test.com',
        password: 'hashed-password',
        name: 'Employee Test',
        organizationId: org.id,
      },
      {
        id: 'client-user-id',
        email: 'client@test.com',
        password: 'hashed-password',
        name: 'Client Test',
        organizationId: org.id,
        linkedClientId: 'client-record-id',
      },
    ],
  });

  // Assign roles (assuming roles exist or we can bypass them via mock guards)
  // For integration tests, it's often easier to mock the JwtAuthGuard or generate a valid JWT manually.
});

afterAll(async () => {
  await prisma.$disconnect();
});
