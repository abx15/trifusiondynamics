import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { parsePagination } from '../../../common/utils/pagination';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly db: PrismaService) {}

  async generateKey(
    organizationId: string,
    userId: string,
    dto: CreateApiKeyDto,
  ) {
    const rawKey = 'tfx_live_' + crypto.randomBytes(16).toString('hex');
    const keyPrefix = rawKey.substring(0, 12); // "tfx_live_xxx"
    const hashedKey = await bcrypt.hash(rawKey, 10);

    const apiKey = await this.db.apiKey.create({
      data: {
        name: dto.name,
        keyPrefix,
        hashedKey,
        scopes: dto.scopes || [],
        organizationId,
        createdById: userId,
      },
    });

    // Return the raw key ONLY once. The client must store it.
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      rawKey,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    };
  }

  async findAll(organizationId: string, page?: number, limit?: number) {
    const { skip, take } = parsePagination(page, limit);
    const keys = await this.db.apiKey.findMany({
      where: { organizationId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    // Never return hashedKey
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async revokeKey(organizationId: string, id: string) {
    const key = await this.db.apiKey.findUnique({
      where: { id, organizationId },
    });
    if (!key) throw new NotFoundException('API Key not found');

    await this.db.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Key revoked successfully' };
  }

  async validateKey(rawKey: string): Promise<any> {
    if (!rawKey.startsWith('tfx_live_')) return null;

    const keyPrefix = rawKey.substring(0, 12);
    const keyRecord = await this.db.apiKey.findFirst({
      where: { keyPrefix, isActive: true },
    });

    if (!keyRecord) return null;

    const isValid = await bcrypt.compare(rawKey, keyRecord.hashedKey);
    if (!isValid) return null;

    // Update last used time in background
    this.db.apiKey
      .update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((e) => this.logger.error('Failed to update lastUsedAt', e));

    return keyRecord;
  }
}
