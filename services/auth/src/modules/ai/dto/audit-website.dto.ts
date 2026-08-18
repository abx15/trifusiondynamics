import { IsString, IsUrl } from 'class-validator';

export class AuditWebsiteDto {
  @IsUrl()
  websiteUrl: string;
}
