import type { Request } from 'express';
import { OAuthCookieStateStore } from './oauth-cookie-state.store';

describe('OAuthCookieStateStore', () => {
  it('returns the PKCE verifier only for the stored state and clears the cookie', () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const request = {
      res: { cookie, clearCookie },
      cookies: {},
    } as unknown as Request;
    const store = new OAuthCookieStateStore();
    let state = '';

    store.store(
      request,
      'pkce-verifier',
      undefined,
      undefined,
      (_error, value) => {
        state = value ?? '';
      },
    );
    const payload = cookie.mock.calls[0][1] as string;
    (request.cookies as Record<string, string>).melo_oauth_state = payload;

    let result: boolean | string = false;
    store.verify(request, state, undefined, (_error, validOrVerifier) => {
      result = validOrVerifier;
    });

    expect(result).toBe('pkce-verifier');
    expect(clearCookie).toHaveBeenCalledWith('melo_oauth_state', {
      path: '/auth/google/callback',
    });
  });

  it('rejects a state that does not match the cookie', () => {
    const cookie = jest.fn();
    const request = {
      res: { cookie, clearCookie: jest.fn() },
      cookies: {},
    } as unknown as Request;
    const store = new OAuthCookieStateStore();
    store.store(request, 'pkce-verifier', undefined, undefined, jest.fn());
    (request.cookies as Record<string, string>).melo_oauth_state = cookie.mock
      .calls[0][1] as string;

    let result: boolean | string = true;
    store.verify(
      request,
      'wrong-state',
      undefined,
      (_error, validOrVerifier) => {
        result = validOrVerifier;
      },
    );

    expect(result).toBe(false);
  });
});
