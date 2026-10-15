import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FailoverController } from './failover.controller';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FailoverController],
  exports: [FailoverController],
})
export class FailoverModule {}