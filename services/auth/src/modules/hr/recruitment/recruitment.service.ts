import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { RecruitmentStage } from '@prisma/client';

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCandidateDto, orgId: string) {
    return this.prisma.recruitment.create({
      data: {
        position: dto.position,
        department: dto.department,
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        resumeUrl: dto.resumeUrl,
        notes: dto.notes,
        stage: RecruitmentStage.APPLIED,
        organizationId: orgId,
      },
    });
  }

  async findAll(orgId: string, stage?: RecruitmentStage) {
    const where: any = { organizationId: orgId };
    if (stage) {
      where.stage = stage;
    }
    return this.prisma.recruitment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStage(id: string, dto: MoveStageDto, orgId: string) {
    const candidate = await this.prisma.recruitment.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    return this.prisma.recruitment.update({
      where: { id },
      data: {
        stage: dto.stage,
      },
    });
  }
}
