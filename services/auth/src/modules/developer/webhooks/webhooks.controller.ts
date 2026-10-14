import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { AdaptiveThrottle } from '../../../common/decorators/adaptive-throttle.decorator';

@Controller('developer/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @RequirePermissions('developer:write')
  @AdaptiveThrottle({
    limit: 10,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createWebhookDto: CreateWebhookDto,
  ) {
    return this.webhooksService.create(user.orgId, createWebhookDto);
  }

  @Get()
  @RequirePermissions('developer:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhooksService.findAll(
      user.orgId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch(':id/toggle')
  @RequirePermissions('developer:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  toggleActive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.webhooksService.toggleActive(user.orgId, id);
  }

  @Get(':id/deliveries')
  @RequirePermissions('developer:read')
  @AdaptiveThrottle({
    limit: 100,
    ttl: 60000,
    category: 'read',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  getDeliveries(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.webhooksService.getDeliveries(user.orgId, id);
  }
}
