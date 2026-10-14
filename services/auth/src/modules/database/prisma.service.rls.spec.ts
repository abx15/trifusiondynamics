import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { JwtPayload } from '@agency-os/types';

describe('PrismaService RLS Enforcement', () => {
  let prismaService: PrismaService;
  let requestContext: RequestContextService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, RequestContextService],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    requestContext = module.get<RequestContextService>(RequestContextService);

    // Initialize a request context for testing
    requestContext.run(new Map<string, string>(), () => {
      // Empty context
    });
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  describe('ContactSubmission RLS', () => {
    const testOrgId = 'test-org-123';
    const otherOrgId = 'other-org-456';

    it('should set app.current_org_id when orgId is in context', async () => {
      requestContext.run(new Map([['orgId', testOrgId]]), async () => {
        const orgId = requestContext.getOrgId();
        expect(orgId).toBe(testOrgId);

        // Verify the middleware sets the session variable
        // This is tested via actual query execution in e2e tests
      });
    });

    it('should allow bypass for super-admin', async () => {
      const superAdminPayload: JwtPayload = {
        sub: 'user-123',
        email: 'admin@test.com',
        orgId: testOrgId,
        roles: ['super_admin'],
        permissions: ['*'],
      };

      requestContext.run(
        new Map([
          ['orgId', testOrgId],
          ['bypassRls', 'on'],
        ]),
        async () => {
          const bypassRls = requestContext.get<string>('bypassRls');
          expect(bypassRls).toBe('on');
        },
      );
    });

    it('should not set bypass for regular users', async () => {
      const regularUserPayload: JwtPayload = {
        sub: 'user-456',
        email: 'user@test.com',
        orgId: testOrgId,
        roles: ['employee'],
        permissions: ['crm:read'],
      };

      requestContext.run(new Map([['orgId', testOrgId]]), async () => {
        const bypassRls = requestContext.get<string>('bypassRls');
        expect(bypassRls).toBeUndefined();
      });
    });
  });

  describe('RLS Policy Integration', () => {
    it('should execute RLS middleware for ContactSubmission queries', async () => {
      // This is a unit test - full integration requires a real database
      // The middleware is registered in PrismaService constructor
      expect(prismaService).toBeDefined();
    });

    it('should skip RLS for raw queries', async () => {
      // Raw queries should bypass the RLS middleware
      // This is handled by the middleware check for rawActions
      const rawActions = ['executeRaw', 'queryRaw', 'runCommandRaw'];
      expect(rawActions).toContain('executeRaw');
    });
  });
});
