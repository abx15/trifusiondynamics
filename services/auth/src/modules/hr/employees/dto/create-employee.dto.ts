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
