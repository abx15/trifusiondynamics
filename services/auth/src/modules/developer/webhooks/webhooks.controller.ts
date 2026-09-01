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

@Controller('developer/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @RequirePermissions('developer:write')
  create(@Req() req, @Body() createWebhookDto: CreateWebhookDto) {
    return this.webhooksService.create(
      req.user.organizationId,
      createWebhookDto,
    );
  }

  @Get()
  @RequirePermissions('developer:read')
  findAll(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhooksService.findAll(
      req.user.organizationId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch(':id/toggle')
  @RequirePermissions('developer:write')
  toggleActive(@Req() req, @Param('id') id: string) {
    return this.webhooksService.toggleActive(req.user.organizationId, id);
  }

  @Get(':id/deliveries')
  @RequirePermissions('developer:read')
  getDeliveries(@Req() req, @Param('id') id: string) {
    return this.webhooksService.getDeliveries(req.user.organizationId, id);
  }
}
