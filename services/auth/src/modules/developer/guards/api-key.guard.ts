import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];

    if (!apiKeyHeader) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const keyRecord = await this.apiKeysService.validateKey(apiKeyHeader);
    if (!keyRecord) {
      throw new UnauthorizedException('Invalid or expired API Key');
    }

    // Attach organization and permissions to request for downstream usage
    request.user = {
      organizationId: keyRecord.organizationId,
      userId: keyRecord.createdById,
      roles: ['developer'],
      permissions: keyRecord.scopes,
    };

    return true;
  }
}
