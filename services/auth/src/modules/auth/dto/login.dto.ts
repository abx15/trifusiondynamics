import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
} from '../../../validation/schemas/common.schema';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password!: string;
}

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
