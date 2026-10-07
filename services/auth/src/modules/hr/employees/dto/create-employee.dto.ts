import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { EmploymentType } from '@prisma/client';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  userId!: string;

  /**
   * Preferred: a real Department FK. Must belong to the caller's organization,
   * otherwise the request is rejected.
   */
  @IsOptional()
  @IsString()
  departmentId?: string;

  /**
   * Legacy free-text department. When `departmentId` is absent, the service
   * resolves this to an org-scoped Department (creating it if needed) and also
   * stores the raw text in `departmentLegacy`.
   */
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsNotEmpty()
  @IsDateString()
  joiningDate!: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
}
export { EmploymentType };
