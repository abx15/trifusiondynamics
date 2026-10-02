import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadSource,
  PipelineStage,
  Prisma,
  SubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  paginatedResult,
  parsePagination,
} from '../../common/utils/pagination';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  subject?: string | null;
  message?: string | null;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'ARCHIVED';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  company?: string | null;
  source: string;
  stage: string;
  value?: number;
  notes?: string | null;
  organizationId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubmission(data: any): Promise<ContactSubmission> {
    const name = String(data.name ?? '').trim();
    const email = String(data.email ?? '')
      .trim()
      .toLowerCase();
    const message = String(data.message ?? '').trim();

    if (!name || !email || !message) {
      throw new BadRequestException('Name, email, and message are required');
    }

    return this.prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone: data.phone ? String(data.phone).trim() : null,
        company: data.company ? String(data.company).trim() : null,
        subject: data.subject ? String(data.subject).trim() : null,
        message,
        source: data.source ? String(data.source).trim() : 'contact-form',
      },
    });
  }

  async getSubmissions(query?: {
    status?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip, take } = parsePagination(
      query?.page,
      query?.limit,
    );
    const where: Prisma.ContactSubmissionWhereInput = {};

    if (
      query?.status &&
      Object.values(SubmissionStatus).includes(query.status as SubmissionStatus)
    ) {
      where.status = query.status as SubmissionStatus;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactSubmission.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contactSubmission.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async getSubmissionById(id: string): Promise<ContactSubmission | null> {
    return this.prisma.contactSubmission.findUnique({
      where: { id },
    });
  }

  async promoteSubmissionToLead(
    submissionId: string,
    organizationId: string,
  ): Promise<Lead> {
    const sub = await this.getSubmissionById(submissionId);
    if (!sub) {
      throw new NotFoundException('Contact submission not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          name: sub.name,
          email: sub.email,
          phone: sub.phone,
          companyName: sub.company,
          source: LeadSource.WEBSITE,
          stage: PipelineStage.NEW,
          notes: [sub.subject, sub.message].filter(Boolean).join('\n\n'),
          organizationId,
        },
      });

      await tx.contactSubmission.update({
        where: { id: sub.id },
        data: { status: SubmissionStatus.CONTACTED },
      });

      return this.serializeLead(lead);
    });
  }

  async createLead(data: any, organizationId: string): Promise<Lead> {
    const name = String(data.name ?? '').trim();
    const email = String(data.email ?? '')
      .trim()
      .toLowerCase();

    if (!name || !email) {
      throw new BadRequestException('Lead name and email are required');
    }

    const lead = await this.prisma.lead.create({
      data: {
        name,
        email,
        phone: data.phone ? String(data.phone).trim() : null,
        companyName: data.companyName || data.company || null,
        source: this.normalizeLeadSource(data.source),
        stage: this.normalizePipelineStage(data.stage),
        estimatedValue:
          data.value || data.estimatedValue
            ? new Prisma.Decimal(data.value ?? data.estimatedValue)
            : null,
        notes: data.notes || null,
        organizationId,
      },
    });

    return this.serializeLead(lead);
  }

  async getLeads(
    organizationId: string,
    query?: {
      stage?: string;
      search?: string;
      page?: string | number;
      limit?: string | number;
    },
  ) {
    const { page, limit, skip, take } = parsePagination(
      query?.page,
      query?.limit,
    );
    const where: Prisma.LeadWhereInput = { organizationId };

    if (
      query?.stage &&
      Object.values(PipelineStage).includes(query.stage as PipelineStage)
    ) {
      where.stage = query.stage as PipelineStage;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return paginatedResult(
      items.map((lead) => this.serializeLead(lead)),
      total,
      page,
      limit,
    );
  }

  async moveStage(id: string, newStage: string) {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { stage: this.normalizePipelineStage(newStage) },
    });

    return this.serializeLead(lead);
  }

  async convertToClient(id: string) {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { stage: PipelineStage.WON },
    });

    return { id: lead.convertedToClientId ?? lead.id, name: lead.name };
  }

  private serializeLead(lead: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    companyName: string | null;
    source: LeadSource;
    stage: PipelineStage;
    estimatedValue: Prisma.Decimal | null;
    notes: string | null;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Lead {
    return {
      ...lead,
      company: lead.companyName,
      value: lead.estimatedValue ? Number(lead.estimatedValue) : undefined,
    };
  }

  private normalizePipelineStage(stage?: string): PipelineStage {
    if (stage === 'PROPOSAL') return PipelineStage.PROPOSAL_SENT;
    if (
      stage &&
      Object.values(PipelineStage).includes(stage as PipelineStage)
    ) {
      return stage as PipelineStage;
    }
    return PipelineStage.NEW;
  }

  private normalizeLeadSource(source?: string): LeadSource {
    const normalized = String(source ?? 'WEBSITE')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    if (normalized === 'COLD_EMAIL') return LeadSource.COLD_OUTREACH;
    if (Object.values(LeadSource).includes(normalized as LeadSource)) {
      return normalized as LeadSource;
    }
    return LeadSource.WEBSITE;
  }
}
