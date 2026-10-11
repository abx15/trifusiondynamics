import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('finance/summary')
  @RequirePermission('billing:read')
  async getFinanceSummary(
    @CurrentUser() user: JwtPayload,
    @Query('year') year?: string,
  ): Promise<any> {
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.billingService.getFinanceSummary(user.orgId, targetYear);
  }
}
