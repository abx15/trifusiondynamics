import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('ProjectsService tenant isolation (IDOR regression)', () => {
  let service: ProjectsService;
  let dbMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    dbMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: dbMock },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('scopes findOne by organizationId and rejects cross-tenant access', async () => {
    // Simulate the DB only returning the row when the org matches.
    dbMock.project.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.organizationId === 'org-A') {
        return { id: 'proj-1', organizationId: 'org-A' } as any;
      }
      return null;
    });
    dbMock.task.groupBy.mockResolvedValue([]);

    // Owner org can access its own project.
    const own = await service.findOne('proj-1', 'org-A');
    expect(own.id).toBe('proj-1');

    // Verify the query was scoped to the requesting organization.
    expect(dbMock.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'proj-1',
          organizationId: 'org-A',
        }),
      }),
    );

    // A different organization must NOT be able to read the project (IDOR).
    await expect(service.findOne('proj-1', 'org-B')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('scopes update by organizationId', async () => {
    dbMock.project.findFirst.mockImplementation(async (args: any) =>
      args?.where?.organizationId === 'org-A'
        ? ({ id: 'proj-1', organizationId: 'org-A' } as any)
        : null,
    );
    dbMock.project.update.mockResolvedValue({ id: 'proj-1' } as any);

    await expect(
      service.update('proj-1', { name: 'Hijacked' } as any, 'org-B'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
