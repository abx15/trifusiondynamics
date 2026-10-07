import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AssignmentType,
  EscalationLevel,
  TicketCategory,
  TicketPriority,
  TicketSource,
  TicketType,
} from '@prisma/client';

export class CreateTicketDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  title!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  description!: string;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketSource)
  source?: TicketSource;

  /** Required for CLIENT_SUPPORT tickets raised by a client. */
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class TicketAssignmentInputDto {
  @IsNotEmpty()
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;
}

export class AssignTicketDto {
  /**
   * Exactly one PRIMARY assignee may be active at a time (enforced by a partial
   * unique index). Sending a new primary automatically ends the previous one
   * while keeping its history row.
   */
  @IsOptional()
  @IsArray()
  primary?: TicketAssignmentInputDto[];

  /** Zero or more supporting assignees. */
  @IsOptional()
  @IsArray()
  supporting?: TicketAssignmentInputDto[];

  /** Remove every active assignment first (history is preserved). */
  @IsOptional()
  @IsBoolean()
  replaceAll?: boolean;
}

export class UnassignTicketDto {
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AddCommentDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  /** Internal notes are staff-only and never visible to client users. */
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class AddAttachmentDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  /**
   * URL of the already-uploaded file. The client uploads bytes
   * directly to object storage (pre-signed URL) and registers
   * the resulting reference here — the API never proxies file
   * bytes, which keeps the request size bounded.
   */
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  fileUrl!: string;

  @IsInt()
  @Min(1)
  fileSize!: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  mimeType!: string;
}

export class SubmitResolutionDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  resolution!: string;
}

export class VerifyResolutionDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rejectionReason?: string;
}

export class ReopenTicketDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  reason!: string;
}

export class CloseTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CloseOverrideDto {
  /** Mandatory: an override without a justification is rejected. */
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}

export class CancelTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class EscalateTicketDto {
  @IsEnum(EscalationLevel)
  level!: EscalationLevel;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;
}

export class ClearEscalationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/** Query filters + pagination for ticket lists. */
export class TicketQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  slaState?: 'breached' | 'warning' | 'paused';

  @IsOptional()
  @IsString()
  escalatedOnly?: string;

  @IsOptional()
  @IsString()
  scope?: 'mine' | 'assigned' | 'unassigned' | 'all';

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
