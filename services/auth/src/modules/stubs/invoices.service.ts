import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoicesService {
  async createInvoice(data: any) {
    return { id: 'invoice_1', ...data, status: 'DRAFT', total: 1180 };
  }

  async recordPayment(id: string, amountPaid: number) {
    return { id, status: 'PAID' };
  }
}
