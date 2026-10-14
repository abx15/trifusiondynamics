import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { LeaveType } from '@prisma/client';
import { z } from 'zod';
import { CreateLeaveSchema } from '../../../../validation/schemas';

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

export { LeaveType, CreateLeaveSchema };
export type CreateLeaveInput = z.infer<typeof CreateLeaveSchema>;
