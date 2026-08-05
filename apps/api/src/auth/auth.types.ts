import type { CurrentUser } from '@emote/contracts';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  currentUser: CurrentUser;
}

export interface GoogleIdentity {
  providerAccountId: string;
  email: string;
  displayName: string;
  imageUrl: string | null;
}
