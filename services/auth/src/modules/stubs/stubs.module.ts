import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { InvoicesService } from './invoices.service';
import { TasksService } from './tasks.service';
import { PayslipsService } from './payslips.service';
import { StubsController } from './stubs.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StubsController],
  providers: [LeadsService, InvoicesService, TasksService, PayslipsService],
})
export class StubsModule {}
