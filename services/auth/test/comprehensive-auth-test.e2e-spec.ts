import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAuthToken } from './helpers/auth-helper';

// Test file with comprehensive auth testing
// This file tests all backend services with proper login/logout for all roles

describe('Comprehensive Backend Services Test', () => {
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

    // Generate test tokens for different roles
    adminToken = getAuthToken('admin');
    employeeToken = getAuthToken('employee');
    clientToken = getAuthToken('client');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow Tests', () => {
    describe('Login Functionality', () => {
      it('should login with valid credentials', async () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'password123',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe('admin@test.com');
          });
      });

      it('should fail login with invalid credentials', async () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'wrongpassword',
          })
          .expect(401);
      });

      it('should fail login with non-existent user', async () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'password123',
          })
          .expect(401);
      });
    });

    describe('Logout Functionality', () => {
      it('should logout successfully with valid token', async () => {
        return request(app.getHttpServer())
          .post('/auth/logout')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
          });
      });

      it('should logout without token (graceful)', async () => {
        return request(app.getHttpServer()).post('/auth/logout').expect(201);
      });
    });

    describe('Token Refresh', () => {
      it('should refresh tokens with valid refresh token', async () => {
        const loginRes = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'password123',
          });

        return request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: loginRes.body.refreshToken })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
          });
      });

      it('should fail refresh with invalid token', async () => {
        return request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);
      });
    });

    describe('User Profile', () => {
      it('should get user profile with valid token', async () => {
        return request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('email');
            expect(res.body.user).toHaveProperty('roles');
            expect(res.body.user).toHaveProperty('permissions');
          });
      });

      it('should fail to get profile without token', async () => {
        return request(app.getHttpServer()).get('/auth/me').expect(401);
      });
    });
  });

  describe('Role-Based Access Control Tests', () => {
    describe('Admin Role Access', () => {
      it('should allow admin to access protected endpoints', async () => {
        return request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should allow admin to create leads', async () => {
        return request(app.getHttpServer())
          .post('/stubs/leads')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Lead',
            email: 'lead@test.com',
            companyName: 'Test Company',
          })
          .expect(201);
      });
    });

    describe('Employee Role Access', () => {
      it('should allow employee to access their profile', async () => {
        return request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);
      });

      it('should restrict employee from admin-only endpoints', async () => {
        return request(app.getHttpServer())
          .post('/stubs/leads')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({
            name: 'Test Lead',
            email: 'lead@test.com',
          })
          .expect(403);
      });

      it('should allow employee to view tasks', async () => {
        return request(app.getHttpServer())
          .get('/stubs/tasks')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);
      });
    });

    describe('Client Role Access', () => {
      it('should allow client to access their profile', async () => {
        return request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(200);
      });

      it('should restrict client from internal endpoints', async () => {
        return request(app.getHttpServer())
          .post('/stubs/leads')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            name: 'Test Lead',
            email: 'lead@test.com',
          })
          .expect(403);
      });
    });

    describe('Unauthenticated Access', () => {
      it('should reject unauthenticated requests to protected routes', async () => {
        return request(app.getHttpServer()).get('/auth/me').expect(401);
      });

      it('should reject unauthenticated POST requests', async () => {
        return request(app.getHttpServer())
          .post('/stubs/leads')
          .send({
            name: 'Test Lead',
            email: 'lead@test.com',
          })
          .expect(401);
      });
    });
  });

  describe('Service Module Tests', () => {
    describe('HR Module', () => {
      it('should allow admin to access employee data', async () => {
        return request(app.getHttpServer())
          .get('/hr/employees')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should restrict employee from full employee list', async () => {
        return request(app.getHttpServer())
          .get('/hr/employees')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(403);
      });

      it('should allow employee to access their own data', async () => {
        return request(app.getHttpServer())
          .get('/hr/employees/me')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);
      });
    });

    describe('Projects Module', () => {
      it('should allow admin to create projects', async () => {
        return request(app.getHttpServer())
          .post('/projects/projects')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Project',
            description: 'Test project description',
          })
          .expect(201);
      });

      it('should allow employee to view projects', async () => {
        return request(app.getHttpServer())
          .get('/projects/projects')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);
      });

      it('should restrict client from creating projects', async () => {
        return request(app.getHttpServer())
          .post('/projects/projects')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            name: 'Test Project',
          })
          .expect(403);
      });
    });

    describe('Stubs Module (CRM)', () => {
      it('should allow admin to create leads', async () => {
        return request(app.getHttpServer())
          .post('/stubs/leads')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Lead',
            email: 'lead@test.com',
            companyName: 'Test Company',
          })
          .expect(201);
      });

      it('should allow employee to view leads', async () => {
        return request(app.getHttpServer())
          .get('/stubs/leads')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);
      });

      it('should allow admin to create invoices', async () => {
        return request(app.getHttpServer())
          .post('/stubs/invoices')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            clientId: 'test-client-id',
            items: [],
            totalAmount: 1000,
          })
          .expect(201);
      });
    });

    describe('AI Module', () => {
      it('should allow authenticated users to access AI features', async () => {
        return request(app.getHttpServer())
          .post('/ai/chat')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            message: 'Test message',
          })
          .expect(201);
      });

      it('should restrict unauthenticated AI access', async () => {
        return request(app.getHttpServer())
          .post('/ai/chat')
          .send({
            message: 'Test message',
          })
          .expect(401);
      });
    });

    describe('Analytics Module', () => {
      it('should allow admin to view analytics', async () => {
        return request(app.getHttpServer())
          .get('/analytics/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should restrict employee from full analytics', async () => {
        return request(app.getHttpServer())
          .get('/analytics/dashboard')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(403);
      });
    });

    describe('Automation Module', () => {
      it('should allow admin to create workflows', async () => {
        return request(app.getHttpServer())
          .post('/automation/workflows')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Workflow',
            triggerType: 'EVENT',
            triggerConfig: {},
            actions: [],
          })
          .expect(201);
      });

      it('should restrict employee from creating workflows', async () => {
        return request(app.getHttpServer())
          .post('/automation/workflows')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({
            name: 'Test Workflow',
          })
          .expect(403);
      });
    });

    describe('Developer Module', () => {
      it('should allow admin to manage API keys', async () => {
        return request(app.getHttpServer())
          .post('/developer/api-keys')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test API Key',
            scopes: ['crm:read'],
          })
          .expect(201);
      });

      it('should restrict employee from API key management', async () => {
        return request(app.getHttpServer())
          .post('/developer/api-keys')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({
            name: 'Test API Key',
          })
          .expect(403);
      });
    });
  });

  describe('Cross-Service Integration Tests', () => {
    it('should maintain authentication across multiple service calls', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
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

    it('should handle session invalidation after logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
        });

      const token = loginRes.body.accessToken;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Try to use token after logout
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('Health and Status Checks', () => {
    it('should return health status', async () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });
});
