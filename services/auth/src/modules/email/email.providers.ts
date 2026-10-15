import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  EmailProvider,
  EmailProviderInterface,
  SendEmailOptions,
  SendEmailResult,
  EmailCategory,
} from './email.interface';
import { SecretsService } from '../secrets/secrets.service';

@Injectable()
export class SendGridProvider implements EmailProviderInterface, OnModuleInit {
  private readonly logger = new Logger(SendGridProvider.name);
  private apiKey: string | null = null;
  private defaultFrom: string | null = null;

  constructor(private readonly secrets: SecretsService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.apiKey = await this.secrets.getSecretOrDefault('SENDGRID_API_KEY', '');
      this.defaultFrom = await this.secrets.getSecretOrDefault('SENDGRID_FROM_EMAIL', '');
    } catch {
      this.logger.warn('SendGrid credentials not configured');
    }
  }

  getProviderName(): EmailProvider {
    return 'sendgrid';
  }

  async verifyConnection(): Promise<boolean> {
    return !!this.apiKey;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      throw new Error('SendGrid not configured');
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];
    const cc = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
    const bcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [];

    const payload = {
      personalizations: [
        {
          to: to.map(email => ({ email })),
          cc: cc.map(email => ({ email })),
          bcc: bcc.map(email => ({ email })),
          subject: options.subject,
          dynamic_template_data: options.templateData,
        },
      ],
      from: { email: options.from || this.defaultFrom || 'noreply@example.com' },
      reply_to: options.replyTo ? { email: options.replyTo } : undefined,
      template_id: options.template,
      categories: options.category ? [options.category] : undefined,
      custom_args: options.metadata,
      tracking_settings: {
        click_tracking: { enable: options.trackClicks ?? true },
        open_tracking: { enable: options.trackOpens ?? true },
      },
      mail_settings: {
        sandbox_mode: { enable: process.env.NODE_ENV === 'test' },
      },
    };

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid API error: ${response.status} - ${error}`);
      }

      const messageId = response.headers.get('X-Message-Id') || `sendgrid-${Date.now()}`;

      return {
        messageId,
        accepted: to,
        rejected: [],
        provider: 'sendgrid',
      };
    } catch (error) {
      this.logger.error(`SendGrid send failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

@Injectable()
export class MailgunProvider implements EmailProviderInterface, OnModuleInit {
  private readonly logger = new Logger(MailgunProvider.name);
  private apiKey: string | null = null;
  private domain: string | null = null;
  private defaultFrom: string | null = null;

  constructor(private readonly secrets: SecretsService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.apiKey = await this.secrets.getSecretOrDefault('MAILGUN_API_KEY', '');
      this.domain = await this.secrets.getSecretOrDefault('MAILGUN_DOMAIN', '');
      this.defaultFrom = await this.secrets.getSecretOrDefault('MAILGUN_FROM_EMAIL', '');
    } catch {
      this.logger.warn('Mailgun credentials not configured');
    }
  }

  getProviderName(): EmailProvider {
    return 'mailgun';
  }

  async verifyConnection(): Promise<boolean> {
    return !!this.apiKey && !!this.domain;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey || !this.domain) {
      throw new Error('Mailgun not configured');
    }

    const to = Array.isArray(options.to) ? options.to.join(',') : options.to;
    const cc = options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : undefined;
    const bcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : undefined;

    const formData = new URLSearchParams();
    formData.append('from', options.from || this.defaultFrom || `noreply@${this.domain}`);
    formData.append('to', to);
    if (cc) formData.append('cc', cc);
    if (bcc) formData.append('bcc', bcc);
    formData.append('subject', options.subject);
    if (options.html) formData.append('html', options.html);
    if (options.text) formData.append('text', options.text);
    if (options.replyTo) formData.append('h:Reply-To', options.replyTo);
    if (options.template) formData.append('template', options.template);
    if (options.templateData) {
      for (const [key, value] of Object.entries(options.templateData)) {
        formData.append(`v:${key}`, String(value));
      }
    }
    if (options.category) formData.append('o:tag', options.category);
    if (options.tags) {
      for (const tag of options.tags) {
        formData.append('o:tag', tag);
      }
    }
    formData.append('o:tracking', (options.trackOpens ?? true).toString());
    formData.append('o:tracking-clicks', (options.trackClicks ?? true).toString());
    formData.append('o:tracking-opens', (options.trackOpens ?? true).toString());

    if (options.attachments) {
      for (const attachment of options.attachments) {
        formData.append('attachment', attachment.content.toString('base64'));
      }
    }

    try {
      const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mailgun API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      const messageId = result.id || `mailgun-${Date.now()}`;

      const accepted = Array.isArray(options.to) ? options.to : [options.to];

      return {
        messageId,
        accepted,
        rejected: [],
        provider: 'mailgun',
      };
    } catch (error) {
      this.logger.error(`Mailgun send failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

@Injectable()
export class SESProvider implements EmailProviderInterface, OnModuleInit {
  private readonly logger = new Logger(SESProvider.name);
  private accessKeyId: string | null = null;
  private secretAccessKey: string | null = null;
  private region: string | null = null;
  private defaultFrom: string | null = null;

  constructor(private readonly secrets: SecretsService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.accessKeyId = await this.secrets.getSecretOrDefault('AWS_SES_ACCESS_KEY_ID', '');
      this.secretAccessKey = await this.secrets.getSecretOrDefault('AWS_SES_SECRET_ACCESS_KEY', '');
      this.region = await this.secrets.getSecretOrDefault('AWS_SES_REGION', 'us-east-1');
      this.defaultFrom = await this.secrets.getSecretOrDefault('AWS_SES_FROM_EMAIL', '');
    } catch {
      this.logger.warn('AWS SES credentials not configured');
    }
  }

  getProviderName(): EmailProvider {
    return 'ses';
  }

  async verifyConnection(): Promise<boolean> {
    return !!this.accessKeyId && !!this.secretAccessKey && !!this.region;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.accessKeyId || !this.secretAccessKey || !this.region) {
      throw new Error('AWS SES not configured');
    }

    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

    const client = new SESClient({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });

    const to = Array.isArray(options.to) ? options.to : [options.to];
    const cc = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
    const bcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [];

    const command = new SendEmailCommand({
      Source: options.from || this.defaultFrom || 'noreply@example.com',
      Destination: {
        ToAddresses: to,
        CcAddresses: cc.length > 0 ? cc : undefined,
        BccAddresses: bcc.length > 0 ? bcc : undefined,
      },
      Message: {
        Subject: { Data: options.subject, Charset: 'UTF-8' },
        Body: {
          Html: options.html ? { Data: options.html, Charset: 'UTF-8' } : undefined,
          Text: options.text ? { Data: options.text, Charset: 'UTF-8' } : undefined,
        },
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      Tags: options.tags?.map(tag => ({ Name: 'tag', Value: tag })),
      ConfigurationSetName: options.category,
    });

    try {
      const response = await client.send(command);

      return {
        messageId: response.MessageId || `ses-${Date.now()}`,
        accepted: to,
        rejected: [],
        provider: 'ses',
      };
    } catch (error) {
      this.logger.error(`SES send failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

@Injectable()
export class ResendProvider implements EmailProviderInterface, OnModuleInit {
  private readonly logger = new Logger(ResendProvider.name);
  private apiKey: string | null = null;
  private defaultFrom: string | null = null;

  constructor(private readonly secrets: SecretsService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.apiKey = await this.secrets.getSecretOrDefault('RESEND_API_KEY', '');
      this.defaultFrom = await this.secrets.getSecretOrDefault('RESEND_FROM_EMAIL', '');
    } catch {
      this.logger.warn('Resend credentials not configured');
    }
  }

  getProviderName(): EmailProvider {
    return 'resend';
  }

  async verifyConnection(): Promise<boolean> {
    return !!this.apiKey;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      throw new Error('Resend not configured');
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];
    const cc = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined;
    const bcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined;

    const payload = {
      from: options.from || this.defaultFrom || 'noreply@example.com',
      to,
      cc,
      bcc,
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      headers: options.headers,
      tags: options.tags?.map(tag => ({ name: 'tag', value: tag })),
    };

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      return {
        messageId: result.id || `resend-${Date.now()}`,
        accepted: to,
        rejected: [],
        provider: 'resend',
      };
    } catch (error) {
      this.logger.error(`Resend send failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

@Injectable()
export class NodemailerProvider implements EmailProviderInterface, OnModuleInit {
  private readonly logger = new Logger(NodemailerProvider.name);
  private transporter: any = null;
  private defaultFrom: string | null = null;

  constructor(private readonly secrets: SecretsService) {}

  async onModuleInit(): Promise<void> {
    try {
      const host = await this.secrets.getSecretOrDefault('SMTP_HOST', '');
      const port = parseInt(await this.secrets.getSecretOrDefault('SMTP_PORT', '587'), 10);
      const user = await this.secrets.getSecretOrDefault('SMTP_USER', '');
      const pass = await this.secrets.getSecretOrDefault('SMTP_PASS', '');
      this.defaultFrom = await this.secrets.getSecretOrDefault('SMTP_FROM_EMAIL', '');

      if (host && user && pass) {
        const nodemailer = await import('nodemailer');
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      }
    } catch {
      this.logger.warn('Nodemailer not configured');
    }
  }

  getProviderName(): EmailProvider {
    return 'nodemailer';
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.transporter) {
      throw new Error('Nodemailer not configured');
    }

    const to = Array.isArray(options.to) ? options.to.join(',') : options.to;
    const cc = options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : undefined;
    const bcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : undefined;

    const attachments = options.attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      disposition: a.disposition,
      cid: a.cid,
    }));

    try {
      const info = await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to,
        cc,
        bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        headers: options.headers,
        attachments,
      });

      return {
        messageId: info.messageId || `nodemailer-${Date.now()}`,
        accepted: Array.isArray(options.to) ? options.to : [options.to],
        rejected: [],
        provider: 'nodemailer',
      };
    } catch (error) {
      this.logger.error(`Nodemailer send failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

@Injectable()
export class ConsoleProvider implements EmailProviderInterface {
  private readonly logger = new Logger(ConsoleProvider.name);

  getProviderName(): EmailProvider {
    return 'console';
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const to = Array.isArray(options.to) ? options.to : [options.to];

    this.logger.log(`[EMAIL] To: ${to.join(', ')}`);
    this.logger.log(`[EMAIL] Subject: ${options.subject}`);
    this.logger.log(`[EMAIL] Category: ${options.category || 'transactional'}`);
    if (options.html) {
      this.logger.log(`[EMAIL] HTML: ${options.html.substring(0, 200)}...`);
    }
    if (options.text) {
      this.logger.log(`[EMAIL] Text: ${options.text.substring(0, 200)}...`);
    }

    return {
      messageId: `console-${Date.now()}`,
      accepted: to,
      rejected: [],
      provider: 'console',
    };
  }
}