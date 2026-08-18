import { Injectable } from '@nestjs/common';

@Injectable()
export class TasksService {
  async createTask(data: any) {
    return { id: 'task_1', ...data };
  }

  async moveTask(id: string, status: string, order: number) {
    return { id, status, order };
  }
}
