import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '@agency-os/types';

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
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) {
        throw new UnauthorizedException('Server misconfigured: JWT_ACCESS_SECRET not set');
      }
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

