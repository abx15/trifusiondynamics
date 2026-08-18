import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateCandidateDto {
  @IsNotEmpty()
  @IsString()
  position!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsNotEmpty()
  @IsString()
  candidateName!: string;

  @IsNotEmpty()
  @IsEmail()
  candidateEmail!: string;

  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
