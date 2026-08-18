import { IsNotEmpty, IsEnum } from 'class-validator';
import { RecruitmentStage } from '@prisma/client';

export class MoveStageDto {
  @IsNotEmpty()
  @IsEnum(RecruitmentStage)
  stage!: RecruitmentStage;
}
export { RecruitmentStage };
