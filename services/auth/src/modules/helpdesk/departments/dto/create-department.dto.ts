import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  /** Organization-scoped unique code, e.g. "IT", "HR", "FINANCE". */
  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code may only contain letters, digits, underscores and hyphens',
  })
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Whether this department may own tickets / routing rules. */
  @IsOptional()
  @IsBoolean()
  isHelpdesk?: boolean;
}
