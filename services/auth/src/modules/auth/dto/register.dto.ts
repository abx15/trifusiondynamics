import { IsNotEmpty, IsString, MinLength, IsEmail } from 'class-validator';
import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
} from '../../../validation/schemas/common.schema';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  organizationName!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;
}

export const RegisterSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(255),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: emailSchema,
  password: passwordSchema,
});
