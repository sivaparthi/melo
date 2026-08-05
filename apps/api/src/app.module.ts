import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FriendsModule } from './friends/friends.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { SessionGateway } from './session.gateway';

@Module({
  imports: [PrismaModule, AuthModule, FriendsModule, RoomsModule],
  controllers: [AppController],
  providers: [AppService, SessionGateway],
})
export class AppModule {}
