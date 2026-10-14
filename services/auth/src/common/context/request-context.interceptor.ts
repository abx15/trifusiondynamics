import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContextService } from './request-context.service';
import { JwtPayload } from '@agency-os/types';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (user && user.orgId) {
      this.requestContext.setOrgId(user.orgId);
    }

    // Set RLS bypass for super-admins
    if (user && user.roles) {
      const superAdminRoles = ['superadmin', 'super_admin'];
      if (superAdminRoles.some((role) => user.roles.includes(role))) {
        this.requestContext.set('bypassRls', 'on');
      }
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
