import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class ClientScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Must be authenticated and have the client role
    if (!user || !user.roles?.includes('client')) {
      throw new ForbiddenException('Access denied. Client role required.');
    }

    if (!user.linkedClientId) {
      throw new ForbiddenException('User is not linked to a Client record.');
    }

    return true;
  }
}
