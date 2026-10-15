import { Module, Global } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { HealthController } from './health.controller';

@Global()
@Module({
  providers: [HealthCheckService],
  controllers: [HealthController],
  exports: [HealthCheckService],
})
export class HealthModule {}