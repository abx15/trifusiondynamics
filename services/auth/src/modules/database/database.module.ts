import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { UnitOfWorkService } from '../../common/prisma/unit-of-work.service';
import { AuditService } from '../../common/audit/audit.service';
import { OutboxPublisher } from '../../common/events/outbox.publisher';

@Global()
@Module({
  providers: [
    PrismaService,
    RequestContextService,
    UnitOfWorkService,
    AuditService,
    OutboxPublisher,
  ],
  exports: [
    PrismaService,
    RequestContextService,
    UnitOfWorkService,
    AuditService,
    OutboxPublisher,
  ],
})
export class DatabaseModule {}
