import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowEngineService } from '../engine/workflow-engine.service';

@Injectable()
export class LeadEventsListener {
  private readonly logger = new Logger(LeadEventsListener.name);

  constructor(
    private readonly db: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  @OnEvent('lead.created')
  async handleLeadCreatedEvent(payload: any) {
    this.logger.debug(`Received lead.created event`);
    await this.triggerEventWorkflows('lead.created', payload);
  }

  @OnEvent('invoice.overdue')
  async handleInvoiceOverdueEvent(payload: any) {
    this.logger.debug(`Received invoice.overdue event`);
    await this.triggerEventWorkflows('invoice.overdue', payload);
  }

  private async triggerEventWorkflows(eventName: string, payload: any) {
    // Find active EVENT workflows with matching event name
    const workflows = await this.db.workflow.findMany({
      where: {
        isActive: true,
        triggerType: 'EVENT',
      },
    });

    const matchingWorkflows = workflows.filter((wf: any) => {
      const config = wf.triggerConfig;
      return config && config.event === eventName;
    });

    for (const wf of matchingWorkflows) {
      // Fire and forget
      this.workflowEngine
        .execute(wf, payload)
        .catch((e) =>
          this.logger.error(`Error kicking off workflow ${wf.id}:`, e),
        );
    }
  }
}
