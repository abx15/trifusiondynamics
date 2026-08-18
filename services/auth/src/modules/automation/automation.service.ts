import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateWorkflowDto, TriggerType } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowEngineService } from './engine/workflow-engine.service';

@Injectable()
export class AutomationService {
  constructor(
    private readonly db: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  async create(organizationId: string, createWorkflowDto: CreateWorkflowDto) {
    return this.db.workflow.create({
      data: {
        ...createWorkflowDto,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.db.workflow.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findOne(organizationId: string, id: string) {
    const workflow = await this.db.workflow.findUnique({
      where: { id, organizationId },
      include: {
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async update(
    organizationId: string,
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
  ) {
    await this.findOne(organizationId, id); // check exists
    return this.db.workflow.update({
      where: { id },
      data: updateWorkflowDto,
    });
  }

  async toggleActive(organizationId: string, id: string) {
    const workflow = await this.findOne(organizationId, id);
    return this.db.workflow.update({
      where: { id },
      data: { isActive: !workflow.isActive },
    });
  }

  async triggerManual(organizationId: string, id: string) {
    const workflow = await this.findOne(organizationId, id);
    if (workflow.triggerType !== TriggerType.MANUAL) {
      throw new Error('Only MANUAL workflows can be triggered this way');
    }
    // Fire and forget
    this.workflowEngine
      .execute(workflow, { source: 'manual_trigger' })
      .catch(console.error);
    return { message: 'Workflow triggered successfully' };
  }

  async getRuns(organizationId: string, id: string) {
    await this.findOne(organizationId, id); // check exists
    return this.db.workflowRun.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: 'desc' },
    });
  }
}
