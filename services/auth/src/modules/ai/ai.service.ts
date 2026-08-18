import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../database/prisma.service';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { AuditWebsiteDto } from './dto/audit-website.dto';
import { WriteEmailDto } from './dto/write-email.dto';
import { SummarizeMeetingDto } from './dto/summarize-meeting.dto';
import { AiChatDto } from './dto/ai-chat.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private readonly aiServiceUrl =
    process.env.AI_SERVICE_URL || 'http://localhost:8001';
  private readonly internalSecret = process.env.AI_SERVICE_SECRET || '';

  constructor(
    private httpService: HttpService,
    private db: PrismaService,
  ) {}

  private getInternalHeaders() {
    const headers: Record<string, string> = {};
    if (this.internalSecret) {
      headers['X-Internal-Secret'] = this.internalSecret;
    }
    return headers;
  }

  async generateProposal(
    userId: string,
    organizationId: string,
    dto: GenerateProposalDto,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/internal/proposal-generator`,
          {
            requirements: dto.requirements,
          },
          { headers: this.getInternalHeaders() },
        ),
      );

      const generatedContent = response.data.generatedContent;

      const proposal = await this.db.aiProposalRequest.create({
        data: {
          requirements: dto.requirements,
          generatedContent,
          leadId: dto.leadId,
          clientId: dto.clientId,
          createdById: userId,
          organizationId,
          status: 'completed',
        },
      });

      return proposal;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to communicate with AI Service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProposalHistory(organizationId: string) {
    return this.db.aiProposalRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async auditWebsite(
    userId: string,
    organizationId: string,
    dto: AuditWebsiteDto,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/internal/seo-audit`,
          {
            websiteUrl: dto.websiteUrl,
          },
          { headers: this.getInternalHeaders() },
        ),
      );

      const { score, findings, recommendations } = response.data;

      return await this.db.aiSeoAudit.create({
        data: {
          websiteUrl: dto.websiteUrl,
          score,
          findings,
          recommendations,
          organizationId,
        },
      });
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to communicate with AI Service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSeoAuditHistory(organizationId: string) {
    return this.db.aiSeoAudit.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async writeEmail(userId: string, organizationId: string, dto: WriteEmailDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/internal/email-writer`,
          {
            context: dto.context,
            tone: dto.tone || 'professional',
          },
          { headers: this.getInternalHeaders() },
        ),
      );

      const { subject, body } = response.data;

      return await this.db.aiEmailDraft.create({
        data: {
          context: dto.context,
          tone: dto.tone || 'professional',
          generatedSubject: subject,
          generatedBody: body,
          createdById: userId,
          organizationId,
        },
      });
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to communicate with AI Service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async summarizeMeeting(
    userId: string,
    organizationId: string,
    dto: SummarizeMeetingDto,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/internal/meeting-summary`,
          {
            transcript: dto.transcript,
          },
          { headers: this.getInternalHeaders() },
        ),
      );

      const { summary, actionItems } = response.data;

      return await this.db.aiMeetingSummary.create({
        data: {
          meetingTitle: dto.meetingTitle,
          transcript: dto.transcript,
          summary,
          actionItems,
          createdById: userId,
          organizationId,
        },
      });
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to communicate with AI Service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async chat(userId: string, dto: AiChatDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/internal/chat`,
          {
            message: dto.message,
            conversationHistory: dto.conversationHistory || [],
          },
          { headers: this.getInternalHeaders() },
        ),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to communicate with AI Service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
