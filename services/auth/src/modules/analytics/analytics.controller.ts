import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { AdaptiveThrottle } from '../../common/decorators/adaptive-throttle.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  async getDashboardOverview(
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getDashboardOverview(user.orgId, from, to);
  }

  @Get('revenue')
  @RequirePermissions('analytics:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  async getRevenueTrend(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getRevenueTrend(user.orgId);
  }

  @Get('clients')
  @RequirePermissions('analytics:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  async getClientGrowth(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getClientGrowth(user.orgId);
  }

  @Get('team-performance')
  @RequirePermissions('analytics:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  async getTeamPerformance(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.analyticsService.getTeamPerformance(
      user.orgId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Post('rollup/run-now')
  @RequirePermissions('analytics:read')
  @AdaptiveThrottle({
    limit: 3,
    ttl: 60000,
    category: 'admin',
    roleMultipliers: { admin: 5, super_admin: 10 },
  })
  async runRollupJobNow(@Body('date') date: string) {
    return this.analyticsService.runRollupJobNow(
      date || new Date().toISOString(),
    );
  }
}
