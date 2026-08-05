import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AvatarStyle, CurrentUser } from '@emote/contracts';
import type { Request, Response } from 'express';
import { AuthService, SESSION_COOKIE_NAME } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { CurrentUserProfile } from './current-user.decorator';
import { GoogleConfiguredGuard } from './google-configured.guard';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleConfiguredGuard, AuthGuard('google'))
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(GoogleConfiguredGuard, AuthGuard('google'))
  async googleCallback(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const user = request.user as CurrentUser;
    await this.issueSession(response, user.id);
    response.redirect(`${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/`);
  }

  @Post('dev-login')
  async developmentLogin(
    @Body() body: { displayName?: string; avatarStyle?: AvatarStyle },
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentUser> {
    const displayName = body.displayName?.trim().slice(0, 40) || 'Alex';
    const avatarStyle = body.avatarStyle === 'male' ? 'male' : 'female';
    const user = await this.authService.createDevelopmentUser(
      displayName,
      avatarStyle,
    );
    await this.issueSession(response, user.id);
    return user;
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUserProfile() user: CurrentUser): CurrentUser {
    return user;
  }

  @Patch('me')
  @UseGuards(SessionAuthGuard)
  updateMe(
    @CurrentUserProfile() user: CurrentUser,
    @Body() body: unknown,
  ): Promise<CurrentUser> {
    return this.authService.updateProfile(user.id, body);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.revokeSession(
      this.authService.readSessionCookie(request),
    );
    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  @Delete('me')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async deleteMe(
    @CurrentUserProfile() user: CurrentUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.deleteAccount(user.id);
    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  private async issueSession(
    response: Response,
    userId: string,
  ): Promise<void> {
    const session = await this.authService.createSession(userId);
    response.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
    });
  }
}
