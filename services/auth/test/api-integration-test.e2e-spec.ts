import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API Integration Tests (Live Service)', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;
  let clientToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as different roles to get real tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@trifusiondynamics.com',
        password: 'ChangeThisPassword123!',
      });

    if (adminLogin.status === 201) {
      adminToken = adminLogin.body.accessToken;
    }

    // For testing purposes, we'll use the admin token for employee/client tests
    // In a real scenario, you'd have separate test users
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should login with admin credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@trifusiondynamics.com',
          password: 'ChangeThisPassword123!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('admin@trifusiondynamics.com');
      expect(response.body.user.roles).toContain('admin');
    });

    it('should fail login with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@trifusiondynamics.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should get user profile with valid token', async () => {
      if (!adminToken) {
        console.log('Skipping test - no admin token available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('roles');
    });

    it('should fail to get profile without token', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('should logout successfully', async () => {
      if (!adminToken) {
        console.log('Skipping test - no admin token available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Service Module Access Tests', () => {
    it('should access projects module with authentication', async () => {
      if (!adminToken) {
        console.log('Skipping test - no admin token available');
        return;
      }

      await request(app.getHttpServer())
        .get('/projects/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should access HR module with authentication', async () => {
      if (!adminToken) {
        console.log('Skipping test - no admin token available');
        return;
      }

      await request(app.getHttpServer())
        .get('/hr/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should access stubs (CRM) module with authentication', async () => {
      if (!adminToken) {
        console.log('Skipping test - no admin token available');
        return;
      }

      await request(app.getHttpServer())
        .get('/stubs/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should access AI module with authentication', async () => {
      if (!adminToken) {
        console.log('Skipping test - no admin token available');
        return;
      }

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Test message',
        })
        .expect(201);
    });

    it('should restrict unauthenticated access to protected routes', async () => {
      await request(app.getHttpServer()).get('/projects/projects').expect(401);

      await request(app.getHttpServer()).get('/hr/employees').expect(401);

      await request(app.getHttpServer()).get('/stubs/leads').expect(401);
    });
  });

  describe('Token Refresh Tests', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@trifusiondynamics.com',
          password: 'ChangeThisPassword123!',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail refresh with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('Cross-Service Authentication', () => {
    it('should maintain authentication across multiple service calls', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@trifusiondynamics.com',
          password: 'ChangeThisPassword123!',
        });

      const token = loginRes.body.accessToken;

      // Use same token for multiple services
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/projects/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/stubs/leads')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
