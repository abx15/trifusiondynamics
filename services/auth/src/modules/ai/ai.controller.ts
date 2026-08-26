import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { AuditWebsiteDto } from './dto/audit-website.dto';
import { WriteEmailDto } from './dto/write-email.dto';
import { SummarizeMeetingDto } from './dto/summarize-meeting.dto';
import { AiChatDto } from './dto/ai-chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('proposal-generator')
  @RequirePermissions('ai:write')
  async generateProposal(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateProposalDto,
  ) {
    return this.aiService.generateProposal(user.sub, user.orgId, dto);
  }

  @Get('proposal-generator/history')
  @RequirePermissions('ai:read')
  async getProposalHistory(@CurrentUser() user: JwtPayload) {
    return this.aiService.getProposalHistory(user.orgId);
  }

  @Post('seo-audit')
  @RequirePermissions('ai:write')
  async auditWebsite(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AuditWebsiteDto,
  ) {
    return this.aiService.auditWebsite(user.sub, user.orgId, dto);
  }

  @Get('seo-audit/history')
  @RequirePermissions('ai:read')
  async getSeoAuditHistory(@CurrentUser() user: JwtPayload) {
    return this.aiService.getSeoAuditHistory(user.orgId);
  }

  @Post('email-writer')
  @RequirePermissions('ai:write')
  async writeEmail(
    @CurrentUser() user: JwtPayload,
    @Body() dto: WriteEmailDto,
  ) {
    return this.aiService.writeEmail(user.sub, user.orgId, dto);
  }

  @Post('meeting-summary')
  @RequirePermissions('ai:write')
  async summarizeMeeting(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SummarizeMeetingDto,
  ) {
    return this.aiService.summarizeMeeting(user.sub, user.orgId, dto);
  }

  @Post('chat')
  @RequirePermissions('ai:write')
  async chat(@CurrentUser() user: JwtPayload, @Body() dto: AiChatDto) {
    return this.aiService.chat(user.sub, dto);
  }
}
