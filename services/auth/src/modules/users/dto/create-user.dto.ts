import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  role!: string; // 'superadmin' | 'agent' | 'client' or custom role name

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  linkedClientId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsString()
  organizationId?: string;
}
