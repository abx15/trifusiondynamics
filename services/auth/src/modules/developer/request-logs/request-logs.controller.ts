import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('developer/request-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestLogsController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @RequirePermissions('developer:read')
  async getLogs(
    @Req() req,
    @Query('statusCode') statusCode?: string,
    @Query('path') path?: string,
  ) {
    const where: any = { organizationId: req.user.organizationId };
    if (statusCode) where.statusCode = parseInt(statusCode);
    if (path) where.path = { contains: path };

    return this.db.apiRequestLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
