import { Injectable, Logger } from '@nestjs/common';
import { TemplateEngineInterface, EmailTemplate } from './email.interface';

@Injectable()
export class TemplateEngine implements TemplateEngineInterface {
  private readonly logger = new Logger(TemplateEngine.name);
  private readonly templates = new Map<string, EmailTemplate>();

  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.name, template);
    this.logger.debug(`Registered template: ${template.name}`);
  }

  registerTemplates(templates: EmailTemplate[]): void {
    for (const template of templates) {
      this.registerTemplate(template);
    }
  }

  getTemplate(name: string): EmailTemplate | undefined {
    return this.templates.get(name);
  }

  render(template: string, data: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, String(value ?? ''));
    }

    result = result.replace(/{{\s*if\s+(\w+)\s*}}/g, (match, key) => {
      return data[key] ? '' : '<!-- IF_REMOVED -->';
    });

    result = result.replace(/<!-- IF_REMOVED -->[\s\S]*?<!-- END_IF -->/g, '');

    result = result.replace(/{{\s*each\s+(\w+)\s*}}/g, (match, key) => {
      const items = data[key];
      if (!Array.isArray(items)) return '';
      return '<!-- EACH_START:' + key + '-->';
    });

    result = result.replace(/<!-- EACH_START:(\w+)-->([\s\S]*?)<!-- END_EACH -->/g, (match, key, content) => {
      const items = data[key];
      if (!Array.isArray(items)) return '';
      return items.map(item => {
        let itemContent = content;
        for (const [itemKey, itemValue] of Object.entries(item)) {
          itemContent = itemContent.replace(
            new RegExp(`{{\\s*${key}\\.${itemKey}\\s*}}`, 'g'),
            String(itemValue ?? '')
          );
        }
        return itemContent;
      }).join('');
    });

    return result;
  }

  renderSubject(subject: string, data: Record<string, any>): string {
    return this.render(subject, data);
  }

  renderTemplate(name: string, data: Record<string, any>): { subject: string; html: string; text?: string } {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    return {
      subject: this.renderSubject(template.subject, data),
      html: this.render(template.html, data),
      text: template.text ? this.render(template.text, data) : undefined,
    };
  }
}

export const defaultTemplates: EmailTemplate[] = [
  {
    name: 'welcome',
    subject: 'Welcome to {{organizationName}}!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to {{organizationName}}!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="font-size: 16px;">Hi {{userName}},</p>
          <p>Thank you for joining {{organizationName}}. We're excited to have you on board!</p>
          <p>Your account has been created with the following details:</p>
          <ul style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
            <li><strong>Email:</strong> {{userEmail}}</li>
            <li><strong>Role:</strong> {{userRole}}</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="{{loginUrl}}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get Started</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reach out to our support team.</p>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to {{organizationName}}!\n\nHi {{userName}},\n\nThank you for joining {{organizationName}}. We're excited to have you on board!\n\nYour account details:\n- Email: {{userEmail}}\n- Role: {{userRole}}\n\nGet started: {{loginUrl}}\n\nIf you have any questions, feel free to reach out to our support team.`,
  },
  {
    name: 'password-reset',
    subject: 'Reset your password for {{organizationName}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="font-size: 16px;">Hi {{userName}},</p>
          <p>You requested a password reset for your {{organizationName}} account.</p>
          <p style="margin: 20px 0;">
            <a href="{{resetUrl}}" style="display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </p>
          <p style="color: #666; font-size: 14px;">This link will expire in {{expiryHours}} hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      </body>
      </html>
    `,
    text: `Reset your password for {{organizationName}}\n\nHi {{userName}},\n\nYou requested a password reset for your {{organizationName}} account.\n\nReset your password: {{resetUrl}}\n\nThis link will expire in {{expiryHours}} hours.\n\nIf you didn't request this, please ignore this email.`,
  },
  {
    name: 'invitation',
    subject: 'You\'re invited to join {{organizationName}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="font-size: 16px;">Hi {{inviteeName}},</p>
          <p>{{inviterName}} has invited you to join <strong>{{organizationName}}</strong> as a <strong>{{role}}</strong>.</p>
          <p style="margin: 20px 0;">
            <a href="{{acceptUrl}}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
          </p>
          <p style="color: #666; font-size: 14px;">This invitation will expire in {{expiryDays}} days.</p>
        </div>
      </body>
      </html>
    `,
    text: `You're invited to join {{organizationName}}!\n\nHi {{inviteeName}},\n\n{{inviterName}} has invited you to join {{organizationName}} as a {{role}}.\n\nAccept invitation: {{acceptUrl}}\n\nThis invitation will expire in {{expiryDays}} days.`,
  },
  {
    name: 'notification',
    subject: '{{notificationTitle}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">{{notificationTitle}}</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="font-size: 16px;">Hi {{userName}},</p>
          <div style="background: white; padding: 20px; border-radius: 5px; border: 1px solid #ddd; margin: 20px 0;">
            {{{notificationContent}}}
          </div>
          {{#if actionUrl}}
          <p style="margin: 20px 0;">
            <a href="{{actionUrl}}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">{{actionText}}</a>
          </p>
          {{/if}}
        </div>
      </body>
      </html>
    `,
    text: `{{notificationTitle}}\n\nHi {{userName}},\n\n{{notificationContent}}\n\n{{#if actionUrl}}{{actionUrl}}{{/if}}`,
  },
];