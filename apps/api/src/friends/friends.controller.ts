import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  CurrentUser,
  FriendRequestView,
  PublicProfile,
} from '@emote/contracts';
import { CurrentUserProfile } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(SessionAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  list(@CurrentUserProfile() user: CurrentUser): Promise<PublicProfile[]> {
    return this.friendsService.listFriends(user.id);
  }

  @Get('search')
  search(
    @CurrentUserProfile() user: CurrentUser,
    @Query('username') username: string,
  ): Promise<PublicProfile> {
    return this.friendsService.findUser(username, user.id);
  }

  @Get('requests')
  requests(
    @CurrentUserProfile() user: CurrentUser,
  ): Promise<FriendRequestView[]> {
    return this.friendsService.listRequests(user.id);
  }

  @Post('requests')
  request(
    @CurrentUserProfile() user: CurrentUser,
    @Body() body: unknown,
  ): Promise<FriendRequestView> {
    return this.friendsService.sendRequest(user.id, body);
  }

  @Patch('requests/:requestId')
  @HttpCode(204)
  resolve(
    @CurrentUserProfile() user: CurrentUser,
    @Param('requestId') requestId: string,
    @Body() body: unknown,
  ): Promise<void> {
    return this.friendsService.resolveRequest(user.id, requestId, body);
  }

  @Delete('requests/:requestId')
  @HttpCode(204)
  cancel(
    @CurrentUserProfile() user: CurrentUser,
    @Param('requestId') requestId: string,
  ): Promise<void> {
    return this.friendsService.cancelRequest(user.id, requestId);
  }

  @Delete(':friendId')
  @HttpCode(204)
  unfriend(
    @CurrentUserProfile() user: CurrentUser,
    @Param('friendId') friendId: string,
  ): Promise<void> {
    return this.friendsService.unfriend(user.id, friendId);
  }
}
