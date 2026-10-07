import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UnitOfWorkService } from '../../common/prisma/unit-of-work.service';
import { AuditService } from '../../common/audit/audit.service';
import { OutboxPublisher } from '../../common/events/outbox.publisher';

@Global()
@Module({
  providers: [PrismaService, UnitOfWorkService, AuditService, OutboxPublisher],
  exports: [PrismaService, UnitOfWorkService, AuditService, OutboxPublisher],
})
export class DatabaseModule {}
