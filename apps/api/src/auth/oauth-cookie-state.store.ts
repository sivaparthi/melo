import type { Request } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const OAUTH_STATE_COOKIE = 'melo_oauth_state';

type StoreCallback = (error: Error | null, state?: string) => void;
type VerifyCallback = (
  error: Error | null,
  validOrVerifier: boolean | string,
  state?: unknown,
) => void;

export class OAuthCookieStateStore {
  store(
    request: Request,
    verifier: string,
    _state: unknown,
    _metadata: unknown,
    callback: StoreCallback,
  ): void {
    const state = randomBytes(32).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ state, verifier })).toString(
      'base64url',
    );
    request.res?.cookie(OAUTH_STATE_COOKIE, payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/auth/google/callback',
    });
    callback(null, state);
  }

  verify(
    request: Request,
    state: string,
    _metadata: unknown,
    callback: VerifyCallback,
  ): void {
    const cookies = request.cookies as Record<string, string> | undefined;
    const payload = cookies?.[OAUTH_STATE_COOKIE];
    request.res?.clearCookie(OAUTH_STATE_COOKIE, {
      path: '/auth/google/callback',
    });
    if (!payload) {
      callback(null, false);
      return;
    }

    try {
      const stored = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as { state: string; verifier: string };
      const providedState = Buffer.from(state);
      const expectedState = Buffer.from(stored.state);
      const valid =
        providedState.length === expectedState.length &&
        timingSafeEqual(providedState, expectedState);
      callback(null, valid ? stored.verifier : false);
    } catch {
      callback(null, false);
    }
  }
}
