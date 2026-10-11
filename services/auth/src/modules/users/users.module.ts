import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SuperAdminController } from './super-admin.controller';
import { DatabaseModule } from '../database/database.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [DatabaseModule, AutomationModule],
  controllers: [UsersController, SuperAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
