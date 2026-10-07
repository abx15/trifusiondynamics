import { IsOptional, IsString, IsEnum } from 'class-validator';
import { EmploymentType, EmployeeStatus } from '@prisma/client';

export class UpdateEmployeeDto {
  /** Real Department FK; must belong to the caller's organization. */
  @IsOptional()
  @IsString()
  departmentId?: string;

  /** Legacy free-text department, resolved/created within the organization. */
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
export { EmploymentType, EmployeeStatus };
