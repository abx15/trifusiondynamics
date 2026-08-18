import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../modules/database/prisma.service';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiLoggingInterceptor.name);

  constructor(private readonly db: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const { method, url, ip } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTimeMs = Date.now() - now;
        const statusCode = response.statusCode;

        // Async log writing, don't block the response
        this.logRequest({
          method,
          path: url,
          ipAddress: ip,
          statusCode,
          responseTimeMs,
          organizationId: request.user?.organizationId || 'unauthenticated',
          apiKeyId: request.apiKeyId, // set by the api-key guard if applicable
        });
      }),
    );
  }

  private async logRequest(logData: any) {
    try {
      await this.db.apiRequestLog.create({
        data: logData,
      });
    } catch (error) {
      this.logger.error('Failed to log API request:', error);
    }
  }
}
