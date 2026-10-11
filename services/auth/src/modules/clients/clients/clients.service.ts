import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import {
  parsePagination,
  paginatedResult,
} from '../../../common/utils/pagination';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto, organizationId: string) {
    // Check if client with same email exists in organization
    if (dto.email) {
      const existing = await this.prisma.client.findFirst({
        where: {
          email: dto.email.toLowerCase().trim(),
          organizationId,
        },
      });
      if (existing) {
        throw new BadRequestException('Client with this email already exists');
      }
    }

    // Check GST number uniqueness if provided
    if (dto.gstNumber) {
      const existing = await this.prisma.client.findFirst({
        where: {
          gstNumber: dto.gstNumber.toUpperCase().trim(),
          organizationId,
        },
      });
      if (existing) {
        throw new BadRequestException(
          'Client with this GST number already exists',
        );
      }
    }

    return this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        companyName: dto.companyName?.trim() || null,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        gstNumber: dto.gstNumber?.toUpperCase().trim() || null,
        organizationId,
        status: dto.status || 'ACTIVE',
      },
    });
  }

  async findAll(
    organizationId: string,
    options: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page, limit, skip, take } = parsePagination(
      options.page,
      options.limit,
    );
    const where: any = { organizationId };

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { companyName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.status) {
      where.status = options.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          contacts: true,
          _count: {
            select: {
              tickets: true,
            },
          },
        },
      }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async findOne(id: string, organizationId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId },
      include: {
        contacts: true,
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            tickets: true,
            contacts: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async update(id: string, organizationId: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check email uniqueness if being updated
    if (dto.email && dto.email !== client.email) {
      const existing = await this.prisma.client.findFirst({
        where: {
          email: dto.email.toLowerCase().trim(),
          organizationId,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException('Client with this email already exists');
      }
    }

    // Check GST number uniqueness if being updated
    if (dto.gstNumber && dto.gstNumber !== client.gstNumber) {
      const existing = await this.prisma.client.findFirst({
        where: {
          gstNumber: dto.gstNumber.toUpperCase().trim(),
          organizationId,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(
          'Client with this GST number already exists',
        );
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.companyName !== undefined)
      updateData.companyName = dto.companyName?.trim() || null;
    if (dto.email !== undefined)
      updateData.email = dto.email?.toLowerCase().trim() || null;
    if (dto.phone !== undefined) updateData.phone = dto.phone?.trim() || null;
    if (dto.address !== undefined)
      updateData.address = dto.address?.trim() || null;
    if (dto.gstNumber !== undefined)
      updateData.gstNumber = dto.gstNumber?.toUpperCase().trim() || null;
    if (dto.status !== undefined) updateData.status = dto.status;

    return this.prisma.client.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, organizationId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Soft delete - set status to ARCHIVED
    return this.prisma.client.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async createFromLead(leadId: string, organizationId: string) {
    // This method will be called when converting a lead to a client
    // The lead data should be passed or fetched
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check if client already exists for this lead
    if (lead.convertedToClientId) {
      const existingClient = await this.prisma.client.findUnique({
        where: { id: lead.convertedToClientId },
      });
      if (existingClient) {
        return existingClient;
      }
    }

    const client = await this.prisma.client.create({
      data: {
        name: lead.name,
        companyName: lead.companyName,
        email: lead.email,
        phone: lead.phone,
        organizationId,
        status: 'ACTIVE',
        leadId: lead.id,
      },
    });

    // Update lead with converted client ID
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { convertedToClientId: client.id, stage: 'WON' },
    });

    return client;
  }
}
