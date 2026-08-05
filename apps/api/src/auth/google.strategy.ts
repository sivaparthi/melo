import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Profile,
  Strategy,
  type StrategyOptions,
} from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { OAuthCookieStateStore } from './oauth-cookie-state.store';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID:
        process.env.GOOGLE_CLIENT_ID ?? 'google-client-id-not-configured',
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ??
        'google-client-secret-not-configured',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
      pkce: true,
      state: true,
      store: new OAuthCookieStateStore() as unknown as StrategyOptions['store'],
      passReqToCallback: false,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error('Google did not provide an email address.');
    return this.authService.resolveGoogleUser({
      providerAccountId: profile.id,
      email: email.toLowerCase(),
      displayName: profile.displayName,
      imageUrl: profile.photos?.[0]?.value ?? null,
    });
  }
}
