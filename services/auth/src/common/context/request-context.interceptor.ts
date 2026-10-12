import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.orgId) {
      this.requestContext.setOrgId(user.orgId);
    }

    return next.handle().pipe(
      tap({
        finalize: () => {
          // Cleanup is handled by AsyncLocalStorage automatically when the async context ends
        },
      }),
    );
  }
}
