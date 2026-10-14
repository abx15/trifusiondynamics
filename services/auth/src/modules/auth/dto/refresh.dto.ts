import { IsString } from 'class-validator';
import { z } from 'zod';
import { RefreshSchema } from '../../../validation/schemas';

export class RefreshDto {
  @IsString()
  refreshToken?: string;
}

export { RefreshSchema };
export type RefreshInput = z.infer<typeof RefreshSchema>;
