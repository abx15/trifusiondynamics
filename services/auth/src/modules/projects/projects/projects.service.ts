import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto, orgId: string) {
    // 1. Verify Client exists
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: orgId },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
    }

    // 2. Create Project
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        clientId: dto.clientId,
        status: ProjectStatus.PLANNING,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget,
        organizationId: orgId,
      },
    });
  }

  async findAll(
    orgId: string,
    clientId?: string,
    status?: ProjectStatus,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId: orgId };

    if (clientId) {
      where.clientId = clientId;
    }
    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async findOne(id: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: orgId },
      include: {
        milestones: true,
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            addedAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Task summary counts
    const taskSummary = await this.prisma.task.groupBy({
      by: ['status'],
      where: { projectId: id },
      _count: {
        id: true,
      },
    });

    const taskCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
      total: 0,
    };

    for (const group of taskSummary) {
      const status = group.status;
      const count = group._count.id;
      if (status in taskCounts) {
        taskCounts[status] = count;
        taskCounts.total += count;
      }
    }

    return {
      ...project,
      taskCounts,
    };
  }

  async update(id: string, dto: UpdateProjectDto, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.budget !== undefined) data.budget = dto.budget;
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Set project status to CANCELLED as archive action
    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.CANCELLED },
    });
  }

  async addMember(projectId: string, dto: AddMemberDto, orgId: string) {
    // 1. Verify project exists
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 2. Verify user exists in the organization
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId: orgId },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${dto.userId} not found in this organization`,
      );
    }

    // 3. Upsert member
    return this.prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
      update: {
        role: dto.role || 'member',
      },
      create: {
        projectId,
        userId: dto.userId,
        role: dto.role || 'member',
      },
    });
  }

  async removeMember(projectId: string, userId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });
    if (!member) {
      throw new NotFoundException(
        `Member with User ID ${userId} not found in this project`,
      );
    }

    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return { success: true };
  }
}
