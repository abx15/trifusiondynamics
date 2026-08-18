import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(private readonly db: PrismaService) {}

  async execute(workflow: any, triggerPayload: any) {
    if (!workflow.isActive) {
      this.logger.debug(
        `Workflow ${workflow.id} is inactive, skipping execution.`,
      );
      return;
    }

    // Create a run record
    const run = await this.db.workflowRun.create({
      data: {
        workflowId: workflow.id,
        status: 'RUNNING',
        input: triggerPayload || {},
      },
    });

    try {
      const actions = workflow.actions as any[];
      const outputs: any[] = [];

      for (const action of actions) {
        this.logger.debug(
          `Executing action ${action.type} for workflow ${workflow.id}`,
        );
        // Action Handlers would be properly registered and injected here in a real architecture
        // For Phase 9, we mock the call
        let actionResult = {};

        switch (action.type) {
          case 'send_notification':
            actionResult = {
              status: 'sent',
              template: action.config?.template,
            };
            break;
          case 'create_task':
            actionResult = { status: 'created', taskName: action.config?.name };
            break;
          case 'update_status':
            actionResult = { status: 'updated', target: action.config?.target };
            break;
          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }
        outputs.push({ type: action.type, result: actionResult });
      }

      await this.db.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCESS',
          output: outputs,
          finishedAt: new Date(),
        },
      });
      this.logger.debug(
        `Workflow ${workflow.id} execution completed successfully.`,
      );
    } catch (error: any) {
      this.logger.error(
        `Workflow ${workflow.id} execution failed: ${error.message}`,
      );
      await this.db.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          finishedAt: new Date(),
        },
      });
    }
  }
}
