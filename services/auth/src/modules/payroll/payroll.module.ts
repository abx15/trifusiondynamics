import { Module } from '@nestjs/common';
import { SalaryStructureController } from './salary-structure/salary-structure.controller';
import { SalaryStructureService } from './salary-structure/salary-structure.service';
import { PayslipsController } from './payslips/payslips.controller';
import { PayslipsService } from './payslips/payslips.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SalaryStructureController, PayslipsController],
  providers: [SalaryStructureService, PayslipsService],
  exports: [SalaryStructureService, PayslipsService],
})
export class PayrollModule {}
