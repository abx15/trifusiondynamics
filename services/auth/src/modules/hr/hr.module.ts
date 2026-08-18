import { Module } from '@nestjs/common';
import { EmployeesSubModule } from './employees/employees.module';
import { LeavesSubModule } from './leaves/leaves.module';
import { AttendanceSubModule } from './attendance/attendance.module';
import { RecruitmentSubModule } from './recruitment/recruitment.module';

@Module({
  imports: [
    EmployeesSubModule,
    LeavesSubModule,
    AttendanceSubModule,
    RecruitmentSubModule,
  ],
  exports: [
    EmployeesSubModule,
    LeavesSubModule,
    AttendanceSubModule,
    RecruitmentSubModule,
  ],
})
export class HrModule {}
