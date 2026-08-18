import { IsString, IsOptional } from 'class-validator';

export class GenerateProposalDto {
  @IsString()
  requirements: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  clientId?: string;
}
