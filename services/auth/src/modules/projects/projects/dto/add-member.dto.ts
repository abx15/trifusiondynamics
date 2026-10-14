import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { z } from 'zod';
import { AddMemberSchema } from '../../../../validation/schemas';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  @IsIn(['lead', 'member', 'viewer'])
  role?: string = 'member';
}

export { AddMemberSchema };
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
