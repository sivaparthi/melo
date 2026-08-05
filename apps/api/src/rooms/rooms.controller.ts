import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { CurrentUser, RoomSummary } from '@emote/contracts';
import { CurrentUserProfile } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RoomsService } from './rooms.service';

@Controller('rooms')
@UseGuards(SessionAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(@CurrentUserProfile() user: CurrentUser): Promise<RoomSummary[]> {
    return this.roomsService.listRooms(user.id);
  }

  @Post()
  create(
    @CurrentUserProfile() user: CurrentUser,
    @Body() body: unknown,
  ): Promise<RoomSummary> {
    return this.roomsService.createRoom(user, body);
  }

  @Post(':roomId/members')
  addMember(
    @CurrentUserProfile() user: CurrentUser,
    @Param('roomId') roomId: string,
    @Body() body: unknown,
  ): Promise<RoomSummary> {
    return this.roomsService.addMember(roomId, user.id, body);
  }
}
