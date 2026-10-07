import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { DatabaseModule } from '../../database/database.module';
import { DepartmentsModule } from '../../helpdesk/departments/departments.module';

@Module({
  imports: [DatabaseModule, DepartmentsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesSubModule {}
