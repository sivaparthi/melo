import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class GoogleConfiguredGuard implements CanActivate {
  canActivate(): boolean {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Use development login locally.',
      );
    }
    return true;
  }
}
