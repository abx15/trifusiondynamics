import {
  IsString,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsOptional,
} from 'class-validator';
import { TriggerType } from './create-workflow.dto';

export class UpdateWorkflowDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(TriggerType)
  @IsOptional()
  triggerType?: TriggerType;

  @IsObject()
  @IsOptional()
  triggerConfig?: Record<string, any>;

  @IsArray()
  @IsOptional()
  actions?: any[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
