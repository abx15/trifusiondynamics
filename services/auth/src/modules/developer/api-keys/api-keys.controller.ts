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

@Controller('developer/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @RequirePermissions('developer:write')
  create(@Req() req, @Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeysService.generateKey(
      req.user.organizationId,
      req.user.userId,
      createApiKeyDto,
    );
  }

  @Get()
  @RequirePermissions('developer:read')
  findAll(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.apiKeysService.findAll(
      req.user.organizationId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Delete(':id')
  @RequirePermissions('developer:write')
  remove(@Req() req, @Param('id') id: string) {
    return this.apiKeysService.revokeKey(req.user.organizationId, id);
  }
}
