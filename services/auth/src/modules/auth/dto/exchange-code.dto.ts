import { IsNotEmpty, IsString } from 'class-validator';
import { z } from 'zod';
import {
  ExchangeCodeSchema,
  GenerateExchangeCodeSchema,
} from '../../../validation/schemas';

export class ExchangeCodeDto {
  @IsNotEmpty()
  @IsString()
  code!: string;
}

export class GenerateExchangeCodeDto {
  @IsNotEmpty()
  @IsString()
  redirectUrl!: string;
}

export { ExchangeCodeSchema, GenerateExchangeCodeSchema };
export type ExchangeCodeInput = z.infer<typeof ExchangeCodeSchema>;
export type GenerateExchangeCodeInput = z.infer<
  typeof GenerateExchangeCodeSchema
>;
