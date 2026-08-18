import { IsString, IsOptional } from 'class-validator';

export class WriteEmailDto {
  @IsString()
  context: string;

  @IsString()
  @IsOptional()
  tone?: string = 'professional';
}
