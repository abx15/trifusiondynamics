export type EmailProvider = 'sendgrid' | 'mailgun' | 'ses' | 'resend' | 'nodemailer' | 'console';

export type EmailCategory = 'transactional' | 'marketing';

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  cid?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  category?: EmailCategory;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  replyTo?: string;
  from?: string;
  tags?: string[];
  metadata?: Record<string, string>;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface SendEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  provider: EmailProvider;
}

export interface EmailEvent {
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  messageId: string;
  recipient: string;
  timestamp: Date;
  data?: Record<string, any>;
}

export interface EmailProviderInterface {
  send(options: SendEmailOptions): Promise<SendEmailResult>;
  verifyConnection(): Promise<boolean>;
  getProviderName(): EmailProvider;
}

export interface TemplateEngineInterface {
  render(template: string, data: Record<string, any>): string;
  renderSubject(subject: string, data: Record<string, any>): string;
}

export interface SuppressionListInterface {
  addSuppression(email: string, reason: 'bounce' | 'complaint' | 'unsubscribe'): Promise<void>;
  removeSuppression(email: string): Promise<void>;
  contains(email: string): Promise<boolean>;
  listSuppressions(type?: 'bounce' | 'complaint' | 'unsubscribe'): Promise<string[]>;
}

export interface EmailTrackingInterface {
  trackOpen(messageId: string, recipient: string, metadata?: Record<string, any>): Promise<void>;
  trackClick(messageId: string, recipient: string, url: string, metadata?: Record<string, any>): Promise<void>;
  getStats(messageId: string): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
  }>;
}