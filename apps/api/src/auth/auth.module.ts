import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleConfiguredGuard } from './google-configured.guard';
import { GoogleStrategy } from './google.strategy';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  imports: [PassportModule.register({ session: false })],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleConfiguredGuard,
    GoogleStrategy,
    SessionAuthGuard,
  ],
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
