import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DatabaseModule } from '../database/database.module';
import { RateLimitModule } from '../database/rate-limit.module';

@Module({
  imports: [DatabaseModule, RateLimitModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
