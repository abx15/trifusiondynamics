import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateEmployeeDocumentDto } from './dto/create-document.dto';
import { UpdateEmployeeDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Controller('hr/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermission('hr:write')
  create(@Body() dto: CreateEmployeeDto, @CurrentUser('orgId') orgId: string) {
    return this.employeesService.create(dto, orgId);
  }

  @Get()
  @RequirePermission('hr:read')
  findAll(
    @CurrentUser('orgId') orgId: string,
    @Query('department') department?: string,
    @Query('status') status?: EmployeeStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.employeesService.findAll(
      orgId,
      department,
      status,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('me')
  async findMe(@CurrentUser() user: JwtPayload) {
    return this.employeesService.findByUserId(user.sub, user.orgId);
  }

  @Get('users')
  @RequirePermission('hr:write')
  async findUsersToLink(@CurrentUser('orgId') orgId: string) {
    return this.employeesService.findUsersToLink(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const employee = await this.employeesService.findOne(id, user.orgId);

    // Check ownership: must be the employee themselves OR have 'hr:read' permission
    const isSelf = user.sub === employee.userId;
    const hasHrRead = user.permissions.includes('hr:read');

    if (!isSelf && !hasHrRead) {
      throw new ForbiddenException(
        'You do not have access to this employee profile',
      );
    }

    return employee;
  }

  @Patch(':id')
  @RequirePermission('hr:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.employeesService.update(id, dto, orgId);
  }

  // Document management endpoints
  @Post(':employeeId/documents')
  @RequirePermission('hr:write')
  async addDocument(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Verify employee belongs to organization
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: user.orgId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.employeeDocument.create({
      data: {
        employeeId,
        type: dto.type,
        fileUrl: dto.fileUrl,
      },
    });
  }

  @Patch(':employeeId/documents/:documentId')
  @RequirePermission('hr:write')
  async updateDocument(
    @Param('employeeId') employeeId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateEmployeeDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Verify employee belongs to organization
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: user.orgId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify document belongs to employee
    const document = await this.prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.employeeDocument.update({
      where: { id: documentId },
      data: dto,
    });
  }

  @Delete(':employeeId/documents/:documentId')
  @RequirePermission('hr:write')
  async deleteDocument(
    @Param('employeeId') employeeId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // Verify employee belongs to organization
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: user.orgId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify document belongs to employee
    const document = await this.prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.employeeDocument.delete({
      where: { id: documentId },
    });

    return { success: true };
  }

  @Get(':employeeId/documents/:documentId/download')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async downloadDocument(
    @Param('employeeId') employeeId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: user.orgId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const isSelf = user.sub === employee.userId;
    const hasHrRead = user.permissions.includes('hr:read');

    if (!isSelf && !hasHrRead) {
      this.logger.warn(
        `Unauthorized document download attempt: user=${user.sub} doc=${documentId} org=${user.orgId}`,
      );
      throw new ForbiddenException('You do not have access to this document');
    }

    const document = await this.prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    this.logger.log(
      `Document download authorized: user=${user.sub} doc=${documentId} type=${document.type} org=${user.orgId}`,
    );

    return {
      fileUrl: document.fileUrl,
      type: document.type,
      uploadedAt: document.uploadedAt,
    };
  }
}
export { type JwtPayload };
