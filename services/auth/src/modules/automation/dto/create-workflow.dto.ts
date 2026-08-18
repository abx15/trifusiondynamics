import {
  IsString,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsOptional,
} from 'class-validator';

export enum TriggerType {
  EVENT = 'EVENT',
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL',
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @IsObject()
  triggerConfig: Record<string, any>;

  @IsArray()
  actions: any[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
