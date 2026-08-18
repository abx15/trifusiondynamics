import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaService } from '../../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let dbMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    dbMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: PrismaService, useValue: dbMock },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('execute', () => {
    it('should execute a workflow with multiple actions successfully', async () => {
      const mockRun = { id: 'run-123' };
      dbMock.workflowRun.create.mockResolvedValue(mockRun as any);
      dbMock.workflowRun.update.mockResolvedValue(mockRun as any);

      const workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        isActive: true,
        actions: [
          { type: 'send_notification', config: { template: 'test' } },
          { type: 'create_task', config: { name: 'New Task' } },
        ],
      };

      const payload = { event: 'test.event' };
      await service.execute(workflow, payload);

      expect(dbMock.workflowRun.create).toHaveBeenCalled();
      expect(dbMock.workflowRun.update).toHaveBeenCalled();
    });
  });
});
