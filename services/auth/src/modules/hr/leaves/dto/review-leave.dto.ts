import { IsNotEmpty, IsEnum } from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class ReviewLeaveDto {
  @IsNotEmpty()
  @IsEnum(LeaveStatus)
  status!: LeaveStatus;
}
export { LeaveStatus };
