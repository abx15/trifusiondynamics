import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly db: PrismaService) {}

  async create(organizationId: string, dto: CreateWebhookDto) {
    const secret = dto.secret || crypto.randomBytes(32).toString('hex');

    return this.db.webhook.create({
      data: {
        url: dto.url,
        events: dto.events,
        secret,
        organizationId,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.db.webhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    return this.db.webhook.findUnique({
      where: { id, organizationId },
    });
  }

  async toggleActive(organizationId: string, id: string) {
    const webhook = await this.findOne(organizationId, id);
    if (!webhook) throw new Error('Webhook not found');

    return this.db.webhook.update({
      where: { id },
      data: { isActive: !webhook.isActive },
    });
  }

  async getDeliveries(organizationId: string, webhookId: string) {
    const webhook = await this.findOne(organizationId, webhookId);
    if (!webhook) throw new Error('Webhook not found');

    return this.db.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
