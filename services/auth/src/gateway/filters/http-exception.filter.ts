import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const requestId =
      (request.headers && request.headers['x-request-id']) ||
      request.id ||
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message =
        typeof res === 'string' ? res : res.message || res.error || message;

      // Log rate-limited requests for observability (no sensitive data).
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        this.logger.warn(
          `Rate limited: ${request.method} ${request.url} path="${request.route?.path || request.url}" ip="${request.ip}" requestId="${requestId}"`,
        );
      }
    } else if (exception instanceof Error) {
      import('@sentry/node').then((Sentry) => {
        Sentry.captureException(exception);
      });
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;

      this.logger.error(
        `Unhandled error: ${request.method} ${request.url} requestId="${requestId}"`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
