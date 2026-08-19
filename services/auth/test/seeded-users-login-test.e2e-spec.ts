import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Seeded Users Login Test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const seededUsers = [
    {
      email: 'trifusiondynamics@gmail.com',
      password: 'trifusiondynamicsA3web',
      role: 'superadmin',
      name: 'Trifusion-Dynamics Admin'
    },
    {
      email: 'admin@trifusiondynamics.com',
      password: 'ChangeThisPassword123!',
      role: 'admin',
      name: 'Administrator'
    },
    {
      email: 'sales.trifusion@gmail.com',
      password: 'Welcome@123',
      role: 'sales_agent',
      name: 'Sales & Partnerships'
    },
    {
      email: 'support.trifusion@gmail.com',
      password: 'Welcome@123',
      role: 'support_agent',
      name: 'Support Team'
    },
    {
      email: 'hr.trifusion@gmail.com',
      password: 'Welcome@123',
      role: 'hr_agent',
      name: 'HR & Careers'
    },
    {
      email: 'agent@trifusiondynamics.com',
      password: 'Agent@123',
      role: 'agent',
      name: 'Jane Agent'
    },
    {
      email: 'client@apexretail.com',
      password: 'Client@123',
      role: 'client',
      name: 'Sanjay Singhania'
    }
  ];

  describe('Login all seeded users', () => {
    seededUsers.forEach((user) => {
      it(`should login successfully for ${user.name} (${user.role})`, async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: user.password,
          })
          .expect(201);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(user.email);
        expect(response.body.user.roles).toContain(user.role);
        
        console.log(`✅ ${user.name} (${user.email}) login successful - Role: ${user.role}`);
      });
    });
  });

  describe('Verify user profiles after login', () => {
    seededUsers.forEach((user) => {
      it(`should get correct user profile for ${user.name}`, async () => {
        // First login to get token
        const loginRes = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: user.password,
          });

        const token = loginRes.body.accessToken;

        // Get user profile
        const profileRes = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(profileRes.body.user.email).toBe(user.email);
        expect(profileRes.body.user.name).toBe(user.name);
        expect(profileRes.body.user.roles).toContain(user.role);
        
        console.log(`✅ ${user.name} profile verified - Email: ${user.email}, Roles: ${profileRes.body.user.roles.join(', ')}`);
      });
    });
  });

  describe('Test logout functionality for all users', () => {
    seededUsers.forEach((user) => {
      it(`should logout successfully for ${user.name}`, async () => {
        // First login
        const loginRes = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: user.password,
          });

        const token = loginRes.body.accessToken;

        // Logout
        const logoutRes = await request(app.getHttpServer())
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(logoutRes.body.success).toBe(true);
        
        console.log(`✅ ${user.name} logout successful`);
      });
    });
  });

  describe('Test that logout invalidates tokens', () => {
    seededUsers.forEach((user) => {
      it(`should invalidate access after logout for ${user.name}`, async () => {
        // First login
        const loginRes = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: user.password,
          });

        const token = loginRes.body.accessToken;

        // Logout
        await request(app.getHttpServer())
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        // Try to use the same token after logout
        await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
        
        console.log(`✅ ${user.name} token properly invalidated after logout`);
      });
    });
  });
});