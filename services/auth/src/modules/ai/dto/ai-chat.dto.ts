import { IsString, IsArray, IsOptional } from 'class-validator';

export class AiChatDto {
  @IsString()
  message: string;

  @IsArray()
  @IsOptional()
  conversationHistory?: any[];
}
