import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateEmployeeDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  type?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(2048)
  @Matches(/^((?!%00|\.\.[\\/]|\/etc\/passwd|\/\.env).)*$/, {
    message:
      'URL contains potentially dangerous content (path traversal, null bytes)',
  })
  fileUrl?: string;
}
