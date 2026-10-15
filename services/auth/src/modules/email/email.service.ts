import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EmailProvider,
  SendEmailOptions,
  SendEmailResult,
  EmailCategory,
  EmailTemplate,
  EmailEvent,
  SuppressionListInterface,
  EmailTrackingInterface,
} from './email.interface';
import { TemplateEngine, defaultTemplates } from './template.engine';
import {
  SendGridProvider,
  MailgunProvider,
  SESProvider,
  ResendProvider,
  NodemailerProvider,
  ConsoleProvider,
} from './email.providers';
import { SecretsService } from '../secrets/secrets.service';
import { redisService } from '../database/redis.service';

const EMAIL_QUEUE = 'email';
const SUPPRESSION_KEY_PREFIX = 'email:suppression:';
const TRACKING_KEY_PREFIX = 'email:tracking:';

@Injectable()
export class EmailService implements OnModuleInit, SuppressionListInterface, EmailTrackingInterface {
  private readonly logger = new Logger(EmailService.name);
  private providers = new Map<EmailProvider, any>();
  private activeProvider: EmailProvider = 'console';
  private templateEngine: TemplateEngine;

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    private readonly secrets: SecretsService,
    private readonly sendGridProvider: SendGridProvider,
    private readonly mailgunProvider: MailgunProvider,
    private readonly sesProvider: SESProvider,
    private readonly resendProvider: ResendProvider,
    private readonly nodemailerProvider: NodemailerProvider,
    private readonly consoleProvider: ConsoleProvider,
  ) {
    this.templateEngine = new TemplateEngine();
    this.templateEngine.registerTemplates(defaultTemplates);
  }

  async onModuleInit(): Promise<void> {
    this.providers.set('sendgrid', this.sendGridProvider);
    this.providers.set('mailgun', this.mailgunProvider);
    this.providers.set('ses', this.sesProvider);
    this.providers.set('resend', this.resendProvider);
    this.providers.set('nodemailer', this.nodemailerProvider);
    this.providers.set('console', this.consoleProvider);

    await this.detectActiveProvider();
    await this.templateEngine.registerTemplates(defaultTemplates);

    this.logger.log(`Email service initialized with provider: ${this.activeProvider}`);
  }

  private async detectActiveProvider(): Promise<void> {
    const configuredProvider = (await this.secrets.getSecretOrDefault('EMAIL_PROVIDER', 'console')) as EmailProvider;

    for (const [name, provider] of this.providers.entries()) {
      if (name === configuredProvider) {
        const isHealthy = await provider.verifyConnection();
        if (isHealthy) {
          this.activeProvider = name;
          return;
        }
      }
    }

    this.activeProvider = 'console';
    this.logger.warn(`Configured provider ${configuredProvider} not available, falling back to console`);
  }

  getActiveProvider(): EmailProvider {
    return this.activeProvider;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Provider ${this.activeProvider} not found`);
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];

    for (const recipient of to) {
      if (await this.contains(recipient)) {
        this.logger.warn(`Email suppressed for ${recipient}`);
        return {
          messageId: `suppressed-${Date.now()}`,
          accepted: [],
          rejected: to,
          provider: this.activeProvider,
        };
      }
    }

    return provider.send(options);
  }

  async sendTemplate(
    templateName: string,
    to: string | string[],
    data: Record<string, any>,
    options: Omit<SendEmailOptions, 'to' | 'subject' | 'html' | 'text' | 'template' | 'templateData'> = {}
  ): Promise<SendEmailResult> {
    const rendered = this.templateEngine.renderTemplate(templateName, data);

    return this.send({
      ...options,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async queueEmail(options: SendEmailOptions, delay?: number): Promise<void> {
    await this.emailQueue.add('send-email', options, {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  async queueTemplateEmail(
    templateName: string,
    to: string | string[],
    data: Record<string, any>,
    options: Omit<SendEmailOptions, 'to' | 'subject' | 'html' | 'text' | 'template' | 'templateData'> = {},
    delay?: number
  ): Promise<void> {
    const rendered = this.templateEngine.renderTemplate(templateName, data);

    await this.emailQueue.add('send-email', {
      ...options,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }, {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  registerTemplate(template: EmailTemplate): void {
    this.templateEngine.registerTemplate(template);
  }

  registerTemplates(templates: EmailTemplate[]): void {
    this.templateEngine.registerTemplates(templates);
  }

  getTemplate(name: string): EmailTemplate | undefined {
    return this.templateEngine.getTemplate(name);
  }

  async addSuppression(email: string, reason: 'bounce' | 'complaint' | 'unsubscribe'): Promise<void> {
    const key = `${SUPPRESSION_KEY_PREFIX}${reason}:${email.toLowerCase()}`;
    await redisService.set(key, JSON.stringify({ email, reason, timestamp: Date.now() }), 86400 * 365);
  }

  async removeSuppression(email: string): Promise<void> {
    for (const reason of ['bounce', 'complaint', 'unsubscribe'] as const) {
      const key = `${SUPPRESSION_KEY_PREFIX}${reason}:${email.toLowerCase()}`;
      await redisService.del(key);
    }
  }

  async contains(email: string): Promise<boolean> {
    for (const reason of ['bounce', 'complaint', 'unsubscribe'] as const) {
      const key = `${SUPPRESSION_KEY_PREFIX}${reason}:${email.toLowerCase()}`;
      const value = await redisService.get(key);
      if (value) return true;
    }
    return false;
  }

  async listSuppressions(type?: 'bounce' | 'complaint' | 'unsubscribe'): Promise<string[]> {
    const results: string[] = [];
    const types = type ? [type] : ['bounce', 'complaint', 'unsubscribe'] as const;

    for (const t of types) {
      const pattern = `${SUPPRESSION_KEY_PREFIX}${t}:*`;
      const keys = await this.scanKeys(pattern);
      for (const key of keys) {
        const value = await redisService.get(key);
        if (value) {
          const data = JSON.parse(value);
          results.push(data.email);
        }
      }
    }

    return results;
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const results: string[] = [];
    let cursor = '0';

    do {
      const [newCursor, keys] = await (redisService as any).client?.scan(cursor, 'MATCH', pattern, 'COUNT', 100) || ['0', []];
      cursor = newCursor;
      results.push(...keys);
    } while (cursor !== '0');

    return results;
  }

  async trackOpen(messageId: string, recipient: string, metadata?: Record<string, any>): Promise<void> {
    const key = `${TRACKING_KEY_PREFIX}${messageId}`;
    const data = JSON.stringify({
      messageId,
      recipient,
      opens: 1,
      clicks: 0,
      lastOpen: Date.now(),
      metadata,
    });
    await redisService.set(key, data, 86400 * 30);
  }

  async trackClick(messageId: string, recipient: string, url: string, metadata?: Record<string, any>): Promise<void> {
    const key = `${TRACKING_KEY_PREFIX}${messageId}`;
    const existing = await redisService.get(key);
    let data: any = { messageId, recipient, opens: 0, clicks: 0, metadata };

    if (existing) {
      data = JSON.parse(existing);
    }

    data.clicks += 1;
    data.lastClick = Date.now();
    data.clickedUrls = data.clickedUrls || [];
    data.clickedUrls.push({ url, timestamp: Date.now() });

    await redisService.set(key, JSON.stringify(data), 86400 * 30);
  }

  async getStats(messageId: string): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
  }> {
    const key = `${TRACKING_KEY_PREFIX}${messageId}`;
    const data = await redisService.get(key);

    if (!data) {
      return { sent: 1, delivered: 1, opened: 0, clicked: 0, bounced: 0, complained: 0 };
    }

    const parsed = JSON.parse(data);
    return {
      sent: 1,
      delivered: 1,
      opened: parsed.opens || 0,
      clicked: parsed.clicks || 0,
      bounced: 0,
      complained: 0,
    };
  }

  async handleWebhook(event: EmailEvent): Promise<void> {
    this.logger.log(`Email webhook: ${event.type} for ${event.recipient} (${event.messageId})`);

    switch (event.type) {
      case 'bounced':
        await this.addSuppression(event.recipient, 'bounce');
        break;
      case 'complained':
        await this.addSuppression(event.recipient, 'complaint');
        break;
      case 'unsubscribed':
        await this.addSuppression(event.recipient, 'unsubscribe');
        break;
      case 'opened':
        await this.trackOpen(event.messageId, event.recipient, event.data);
        break;
      case 'clicked':
        await this.trackClick(event.messageId, event.recipient, event.data?.url || '', event.data);
        break;
    }
  }

  async sendBulk(
    emails: Array<SendEmailOptions & { template?: string; templateData?: Record<string, any> }>,
    batchSize = 50,
    delayBetweenBatches = 1000
  ): Promise<SendEmailResult[]> {
    const results: SendEmailResult[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      for (const email of batch) {
        let result: SendEmailResult;
        if (email.template && email.templateData) {
          result = await this.sendTemplate(email.template, email.to, email.templateData, email);
        } else {
          result = await this.send(email);
        }
        results.push(result);
      }

      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return results;
  }
}

export const emailService = new EmailService(
  {} as Queue,
  {} as SecretsService,
  {} as SendGridProvider,
  {} as MailgunProvider,
  {} as SESProvider,
  {} as ResendProvider,
  {} as NodemailerProvider,
  {} as ConsoleProvider,
);