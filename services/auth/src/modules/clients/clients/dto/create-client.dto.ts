import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { ClientStatus } from '@prisma/client';
import { z } from 'zod';
import {
  emailSchema,
  phoneSchema,
} from '../../../../validation/schemas/common.schema';

export class CreateClientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  companyName?: string;

  @IsEmail()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  gstNumber?: string;

  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;
}

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(255),
  companyName: z.string().max(255).optional(),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().max(500).optional(),
  gstNumber: z.string().max(50).optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});
