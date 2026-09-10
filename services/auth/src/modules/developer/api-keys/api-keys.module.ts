import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { DatabaseModule } from '../../database/database.module';
import { RateLimitModule } from '../../database/rate-limit.module';

@Module({
  imports: [DatabaseModule, RateLimitModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
