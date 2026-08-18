import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveDto {
  @IsNotEmpty()
  @IsEnum(LeaveType)
  type!: LeaveType;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
export { LeaveType };
