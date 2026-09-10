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

import { Throttle } from '@nestjs/throttler';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics:read')
  async getDashboardOverview(
    @Req() req,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getDashboardOverview(
      req.user.organizationId,
      from,
      to,
    );
  }

  @Get('revenue')
  @RequirePermissions('analytics:read')
  async getRevenueTrend(@Req() req) {
    return this.analyticsService.getRevenueTrend(req.user.organizationId);
  }

  @Get('clients')
  @RequirePermissions('analytics:read')
  async getClientGrowth(@Req() req) {
    return this.analyticsService.getClientGrowth(req.user.organizationId);
  }

  @Get('team-performance')
  @RequirePermissions('analytics:read')
  async getTeamPerformance(
    @Req() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.analyticsService.getTeamPerformance(
      req.user.organizationId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

   @Post('rollup/run-now')
  @RequirePermissions('analytics:read')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async runRollupJobNow(@Body('date') date: string) {
    return this.analyticsService.runRollupJobNow(
      date || new Date().toISOString(),
    );
  }
}
