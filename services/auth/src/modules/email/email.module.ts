import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { EmailQueueProcessor } from '../queue/processors/email.processor';
import { EmailService } from './email.service';
import { TemplateEngine } from './template.engine';
import {
  SendGridProvider,
  MailgunProvider,
  SESProvider,
  ResendProvider,
  NodemailerProvider,
  ConsoleProvider,
} from './email.providers';
import { SecretsModule } from '../secrets/secrets.module';
import { QueueModule } from '../queue/queue.module';

@Global()
@Module({
  imports: [
    SecretsModule,
    QueueModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.EMAILS,
    }),
  ],
  providers: [
    EmailService,
    TemplateEngine,
    EmailQueueProcessor,
    SendGridProvider,
    MailgunProvider,
    SESProvider,
    ResendProvider,
    NodemailerProvider,
    ConsoleProvider,
  ],
  exports: [
    EmailService,
    TemplateEngine,
    EmailQueueProcessor,
    SendGridProvider,
    MailgunProvider,
    SESProvider,
    ResendProvider,
    NodemailerProvider,
    ConsoleProvider,
  ],
})
export class EmailModule {}