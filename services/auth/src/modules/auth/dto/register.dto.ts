import { IsNotEmpty, IsString, MinLength, IsEmail } from 'class-validator';

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
