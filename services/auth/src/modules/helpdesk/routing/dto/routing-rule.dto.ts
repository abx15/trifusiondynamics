import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TicketCategory, TicketPriority, TicketType } from '@prisma/client';

export class CreateRoutingRuleDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  defaultAgentId?: string;

  @IsOptional()
  @IsString()
  autoAssignEmployeeId?: string;

  @IsOptional()
  @IsString()
  slaPolicyId?: string;

  @IsOptional()
  @IsInt()
  ruleOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoutingRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  defaultAgentId?: string;

  @IsOptional()
  @IsString()
  autoAssignEmployeeId?: string;

  @IsOptional()
  @IsString()
  slaPolicyId?: string;

  @IsOptional()
  @IsInt()
  ruleOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
