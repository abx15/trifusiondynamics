import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  @IsIn(['lead', 'member', 'viewer'])
  role?: string = 'member';
}
