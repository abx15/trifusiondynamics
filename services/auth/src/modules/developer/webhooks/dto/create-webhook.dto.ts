import {
  IsString,
  IsArray,
  IsUrl,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateWebhookDto {
  @IsUrl()
  url: string;

  @IsArray()
  events: string[];

  @IsString()
  @IsOptional()
  secret?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
