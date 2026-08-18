import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsArray()
  @IsOptional()
  scopes?: string[];
}
