import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsSubModule } from './modules/projects/projects/projects.module';
import { HrModule } from './modules/hr/hr.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AutomationModule } from './modules/automation/automation.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { StubsModule } from './modules/stubs/stubs.module';
import { UsersModule } from './modules/users/users.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ApiLoggingInterceptor } from './gateway/interceptors/api-logging.interceptor';
import { AllExceptionsFilter } from './gateway/filters/http-exception.filter';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { RedisModule } from './modules/database/redis.module';
import { RedisThrottlerStorage } from './modules/database/redis-throttler.storage';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 100, // Default 100 req / minute
        },
      ],
      // Distributed, Redis-backed rate limiting with in-memory fallback.
      storage: new RedisThrottlerStorage(),
    }),
    CacheModule.register({ isGlobal: true, store: 'memory', ttl: 300 }),
    RedisModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProjectsSubModule,
    HrModule,
    PayrollModule,
    AiModule,
    AnalyticsModule,
    AutomationModule,
    DeveloperModule,
    StubsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
