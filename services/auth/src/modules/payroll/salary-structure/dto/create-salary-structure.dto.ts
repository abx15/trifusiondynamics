import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateSalaryStructureDto {
  @IsNotEmpty()
  @IsString()
  employeeId!: string;

  @IsNotEmpty()
  @IsNumber()
  basicSalary!: number;

  @IsOptional()
  @IsNumber()
  hra?: number;

  @IsOptional()
  @IsNumber()
  allowances?: number;

  @IsOptional()
  @IsNumber()
  deductions?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
