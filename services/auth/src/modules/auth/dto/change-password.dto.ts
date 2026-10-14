import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { z } from 'zod';
import { ChangePasswordSchema } from '../../../validation/schemas';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export { ChangePasswordSchema };
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
