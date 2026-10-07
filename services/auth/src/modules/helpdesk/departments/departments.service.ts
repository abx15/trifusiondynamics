import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Department, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  UnitOfWorkService,
  Tx,
} from '../../../common/prisma/unit-of-work.service';
import { ActorContext } from '../../../common/auth/actor.decorator';
import {
  AUDIT_ACTIONS,
  AuditService,
} from '../../../common/audit/audit.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import {
  paginatedResult,
  parsePagination,
  PaginatedResult,
} from '../../../common/utils/pagination';

/** Normalises a human-entered department name into a stable code. */
export function normalizeDepartmentCode(input: string): string {
  const code = input
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  if (!code) {
    throw new BadRequestException(
      'Department code must contain at least one letter or digit',
    );
  }
  return code.slice(0, 32);
}

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWorkService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateDepartmentDto,
    actor: ActorContext,
  ): Promise<Department> {
    const code = normalizeDepartmentCode(dto.code);
    const name = dto.name.trim();

    return this.uow.run(async (tx) => {
      const clash = await tx.department.findFirst({
        where: {
          organizationId: actor.organizationId,
          OR: [{ code }, { name }],
        },
      });
      if (clash) {
        throw new ConflictException(
          `A department with ${clash.code === code ? `code "${code}"` : `name "${name}"`} already exists in this organization`,
        );
      }

      const department = await tx.department.create({
        data: {
          organizationId: actor.organizationId,
          code,
          name,
          description: dto.description ?? null,
          isHelpdesk: dto.isHelpdesk ?? true,
        },
      });

      await this.audit.record(tx, {
        organizationId: actor.organizationId,
        action: AUDIT_ACTIONS.DEPARTMENT_CREATED,
        entityType: 'Department',
        entityId: department.id,
        actor,
        after: { code, name, isHelpdesk: department.isHelpdesk },
      });

      return department;
    });
  }

  /**
   * Every read is scoped by `organizationId`, which is taken from the JWT-derived
   * actor context. There is no way to list another tenant's departments.
   */
  async list(
    actor: ActorContext,
    options: { includeInactive?: boolean; page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<Department & { _count?: { employees: number } }>> {
    const { skip, take, page, limit } = parsePagination(
      options.page,
      options.limit,
    );

    const where: Prisma.DepartmentWhereInput = {
      organizationId: actor.organizationId,
      ...(options.includeInactive ? {} : { isActive: true }),
    };

    const [total, departments] = await Promise.all([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        skip,
        take,
        orderBy: [{ name: 'asc' }],
        include: { _count: { select: { employees: true } } },
      }),
    ]);

    return paginatedResult(departments, total, page, limit);
  }

  /** Tenant-scoped lookup. Returns null rather than throwing for internal use. */
  async findInOrg(
    client: PrismaService | Tx,
    departmentId: string,
    organizationId: string,
  ): Promise<Department | null> {
    return client.department.findFirst({
      where: { id: departmentId, organizationId },
    });
  }

  async findById(
    departmentId: string,
    actor: ActorContext,
  ): Promise<Department> {
    const department = await this.findInOrg(
      this.prisma,
      departmentId,
      actor.organizationId,
    );
    if (!department) {
      // 404 rather than 403: a department in another tenant must be
      // indistinguishable from one that does not exist.
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async update(
    departmentId: string,
    dto: UpdateDepartmentDto,
    actor: ActorContext,
  ): Promise<Department> {
    const existing = await this.findById(departmentId, actor);

    return this.uow.run(async (tx) => {
      if (dto.name && dto.name.trim() !== existing.name) {
        const clash = await tx.department.findFirst({
          where: {
            organizationId: actor.organizationId,
            name: dto.name.trim(),
            NOT: { id: departmentId },
          },
        });
        if (clash) {
          throw new ConflictException(
            'A department with that name already exists in this organization',
          );
        }
      }

      const updated = await tx.department.update({
        where: { id: departmentId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.isHelpdesk !== undefined
            ? { isHelpdesk: dto.isHelpdesk }
            : {}),
        },
      });

      await this.audit.record(tx, {
        organizationId: actor.organizationId,
        action: AUDIT_ACTIONS.DEPARTMENT_UPDATED,
        entityType: 'Department',
        entityId: departmentId,
        actor,
        before: {
          name: existing.name,
          description: existing.description,
          isActive: existing.isActive,
          isHelpdesk: existing.isHelpdesk,
        },
        after: {
          name: updated.name,
          description: updated.description,
          isActive: updated.isActive,
          isHelpdesk: updated.isHelpdesk,
        },
      });

      return updated;
    });
  }

  /**
   * Resolves a legacy free-text department value to an org-scoped Department,
   * creating it when it does not exist yet.
   *
   * This is how the pre-migration `Employee.department` strings become real FKs
   * without the caller having to know about departments at all. The raw string
   * is still written to `departmentLegacy` by the caller.
   */
  async resolveOrCreateByName(
    client: PrismaService | Tx,
    organizationId: string,
    legacyValue: string,
  ): Promise<Department | null> {
    const trimmed = legacyValue?.trim();
    if (!trimmed) return null;

    const code = normalizeDepartmentCode(trimmed);
    const name = trimmed;

    const existing = await client.department.findFirst({
      where: {
        organizationId,
        OR: [{ code }, { name: { equals: trimmed, mode: 'insensitive' } }],
      },
    });
    if (existing) {
      return existing;
    }

    try {
      return await client.department.create({
        data: {
          organizationId,
          code,
          name,
          description: 'Created automatically from a legacy department value',
        },
      });
    } catch (error) {
      // Concurrent creation of the same department: re-read and reuse.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        const raced = await client.department.findFirst({
          where: { organizationId, code },
        });
        return raced;
      }
      throw error;
    }
  }

  /**
   * Validates that `departmentId` belongs to the actor's organization. Returns
   * null when the id is absent. Throws when the id is present but foreign —
   * this is the tenant-isolation guard for every ticket write that carries a
   * department.
   */
  async assertInOrg(
    client: PrismaService | Tx,
    departmentId: string | null | undefined,
    organizationId: string,
  ): Promise<string | null> {
    if (!departmentId) return null;
    const department = await this.findInOrg(
      client,
      departmentId,
      organizationId,
    );
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department.id;
  }
}
