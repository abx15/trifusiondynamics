import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TicketCategory, TicketPriority, TicketType } from '@prisma/client';

export class CreateSlaPolicyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsEnum(TicketType)
  ticketType!: TicketType;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsEnum(TicketPriority)
  priority!: TicketPriority;

  @Min(1)
  @IsInt()
  responseTimeMins!: number;

  @Min(1)
  @IsInt()
  resolutionTimeMins!: number;

  /** Percent of the window elapsed after which a warning is raised. 1-99. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  warningThresholdPercent?: number;

  @IsOptional()
  @IsInt()
  policyOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSlaPolicyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  responseTimeMins?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  resolutionTimeMins?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  warningThresholdPercent?: number;

  @IsOptional()
  @IsInt()
  policyOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
