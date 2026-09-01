import {
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateEmployeeDocumentDto {
  @IsNotEmpty()
  @IsString()
  employeeId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  type!: string;

  @IsNotEmpty()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(2048)
  @Matches(/^((?!%00|\.\.[\\/]|\/etc\/passwd|\/\.env).)*$/, {
    message:
      'URL contains potentially dangerous content (path traversal, null bytes)',
  })
  fileUrl!: string;
}
