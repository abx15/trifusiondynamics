import {
  IsOptional,
  IsNumber,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

export class PunchDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
