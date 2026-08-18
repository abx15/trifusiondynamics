import { IsNotEmpty, IsString } from 'class-validator';

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
