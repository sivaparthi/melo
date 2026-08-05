import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.authService.readSessionCookie(request);
    if (!token) throw new UnauthorizedException('Sign in to continue.');

    const user = await this.authService.authenticate(token);
    if (!user) throw new UnauthorizedException('Your session has expired.');
    (request as AuthenticatedRequest).currentUser = user;
    return true;
  }
}
