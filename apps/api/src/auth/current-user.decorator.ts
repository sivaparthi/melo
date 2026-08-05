import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUser } from '@emote/contracts';
import type { AuthenticatedRequest } from './auth.types';

export const CurrentUserProfile = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().currentUser,
);
