import { IsString, IsOptional } from 'class-validator';

export class SummarizeMeetingDto {
  @IsString()
  transcript: string;

  @IsString()
  @IsOptional()
  meetingTitle?: string;
}
