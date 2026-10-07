import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../database/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaMock: {
    organization: {
      findMany: jest.Mock;
    };
    revenueRollup: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    clientRollup: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    teamPerformanceRollup: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    employee: {
      findMany: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      organization: {
        findMany: jest.fn().mockResolvedValue([{ id: 'org-1' }]),
      },
      revenueRollup: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      clientRollup: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      teamPerformanceRollup: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      employee: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'emp-1', userId: 'user-1' },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ total: 0n }]),
    };

    service = new AnalyticsService(prismaMock as unknown as PrismaService);
  });

  describe('getDashboardOverview', () => {
    it('returns revenue, client, and team performance data', async () => {
      const result = await service.getDashboardOverview('org-1');

      expect(prismaMock.revenueRollup.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          periodType: 'daily',
          periodDate: expect.any(Object),
        },
        orderBy: { periodDate: 'asc' },
        take: 365,
      });

      expect(prismaMock.clientRollup.findMany).toHaveBeenCalled();
      expect(prismaMock.teamPerformanceRollup.findMany).toHaveBeenCalled();

      expect(result).toEqual({
        revenueTrend: [],
        clientGrowth: [],
        topPerformers: [],
      });
    });

    it('accepts custom date range', async () => {
      const from = '2024-01-01';
      const to = '2024-01-31';

      await service.getDashboardOverview('org-1', from, to);

      const whereRevenue = prismaMock.revenueRollup.findMany.mock.calls[0][0]
        .where;
      expect(whereRevenue.periodDate.gte).toEqual(new Date(from));
      expect(whereRevenue.periodDate.lte).toEqual(new Date(to));
    });
  });

  describe('getRevenueTrend', () => {
    it('returns daily revenue for last 30 days', async () => {
      await service.getRevenueTrend('org-1');

      expect(prismaMock.revenueRollup.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', periodType: 'daily' },
        orderBy: { periodDate: 'desc' },
        take: 30,
      });
    });
  });

  describe('getClientGrowth', () => {
    it('returns client growth data', async () => {
      await service.getClientGrowth('org-1');

      expect(prismaMock.clientRollup.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { periodDate: 'desc' },
        take: 30,
      });
    });
  });

  describe('getTeamPerformance', () => {
    it('returns team performance for specified month', async () => {
      await service.getTeamPerformance('org-1', 1, 2024);

      expect(prismaMock.teamPerformanceRollup.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          periodDate: new Date(2024, 0, 1),
        },
        orderBy: { tasksCompleted: 'desc' },
      });
    });

    it('defaults to current month/year', async () => {
      const now = new Date();
      await service.getTeamPerformance('org-1');

      const call = prismaMock.teamPerformanceRollup.findMany.mock.calls[0];
      expect(call[0].where.periodDate).toEqual(
        new Date(now.getFullYear(), now.getMonth(), 1),
      );
    });
  });

  describe('runRollupJobNow', () => {
    it('rolls up revenue, clients, and team performance for all organizations', async () => {
      prismaMock.organization.findMany.mockResolvedValue([
        { id: 'org-1' },
        { id: 'org-2' },
      ]);

      const result = await service.runRollupJobNow('2024-01-15');

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true },
      });

      expect(prismaMock.revenueRollup.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.clientRollup.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.teamPerformanceRollup.upsert).toHaveBeenCalled();

      expect(result).toEqual({
        status: 'success',
        message: 'Rollup executed for 2024-01-15',
        processed: 2,
        total: 2,
      });
    });

    it('handles organization failures gracefully', async () => {
      prismaMock.organization.findMany.mockResolvedValue([
        { id: 'org-1' },
        { id: 'org-2' },
      ]);
      prismaMock.revenueRollup.upsert
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB error'));

      const result = await service.runRollupJobNow('2024-01-15');

      expect(result.processed).toBe(1);
      expect(result.total).toBe(2);
    });

    it('uses upsert to overwrite existing data', async () => {
      await service.runRollupJobNow('2024-01-15');

      const upsertCall = prismaMock.revenueRollup.upsert.mock.calls[0];
      expect(upsertCall[0].where).toHaveProperty(
        'organizationId_periodType_periodDate',
      );
    });
  });
});
