import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { AdaptiveThrottle } from '../../../common/decorators/adaptive-throttle.decorator';

@Controller('developer/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

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
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.generateKey(
      user.orgId,
      user.sub,
      createApiKeyDto,
    );
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
    return this.apiKeysService.findAll(
      user.orgId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Delete(':id')
  @RequirePermissions('developer:write')
  @AdaptiveThrottle({
    limit: 50,
    ttl: 60000,
    category: 'write',
    roleMultipliers: { admin: 2, super_admin: 5 },
  })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.apiKeysService.revokeKey(user.orgId, id);
  }
}
