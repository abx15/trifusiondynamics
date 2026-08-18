import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '@agency-os/types';

export const DEFAULT_JWT_ACCESS_SECRET =
  'd5f8b9e67c8a49c2a12a7f5a3b9d0e1c4b7a8d9e0f1a2b3c4d5e6f7a8b9c0d1e';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Try Bearer header first, then cookie
    let token: string | undefined;

    if (request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts[0] === 'Bearer' && parts[1]) {
        token = parts[1];
      }
    }

    if (!token && request.cookies?.access_token) {
      token = request.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    try {
      const secret =
        process.env.JWT_ACCESS_SECRET || DEFAULT_JWT_ACCESS_SECRET;
      const decoded = jwt.verify(token, secret) as JwtPayload;
      request.user = decoded;
      return true;
    } catch (err) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }
}

