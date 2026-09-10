import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    DatabaseModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
