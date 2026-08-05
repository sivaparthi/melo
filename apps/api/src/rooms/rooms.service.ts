import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LiveSessionKind,
  LiveSessionStatus,
  ParticipantStatus,
  Prisma,
} from '@prisma/client';
import {
  addRoomMemberSchema,
  createRoomSchema,
  type CurrentUser,
  type RoomSummary,
} from '@emote/contracts';
import { canonicalUserPair } from '../friends/friends.service';
import { PrismaService } from '../prisma/prisma.service';

const roomInclude = {
  participants: {
    where: { status: ParticipantStatus.accepted },
    include: { user: true },
    orderBy: { joinedAt: 'asc' },
  },
} satisfies Prisma.LiveSessionInclude;

type RoomWithMembers = Prisma.LiveSessionGetPayload<{
  include: typeof roomInclude;
}>;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async listRooms(userId: string): Promise<RoomSummary[]> {
    const rooms = await this.prisma.liveSession.findMany({
      where: {
        status: LiveSessionStatus.open,
        participants: {
          some: { userId, status: ParticipantStatus.accepted },
        },
      },
      include: roomInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rooms.map((room) => this.toSummary(room));
  }

  async createRoom(user: CurrentUser, input: unknown): Promise<RoomSummary> {
    const parsed = createRoomSchema.safeParse(input);
    if (!parsed.success) {
      throw new ConflictException(
        parsed.error.issues[0]?.message ?? 'Invalid room details.',
      );
    }
    if (parsed.data.memberIds.includes(user.id)) {
      throw new ConflictException('You are already included in the room.');
    }

    const allMemberIds = [user.id, ...parsed.data.memberIds];
    await this.assertUsersExist(parsed.data.memberIds);
    await this.assertFriendships(user.id, parsed.data.memberIds);

    if (parsed.data.memberIds.length === 1) {
      const friendId = parsed.data.memberIds[0];
      const directKey = canonicalUserPair(user.id, friendId).join(':');
      const existing = await this.prisma.liveSession.findUnique({
        where: { directKey },
        include: roomInclude,
      });
      if (existing) return this.toSummary(existing);
    }

    const members = await this.prisma.user.findMany({
      where: { id: { in: allMemberIds } },
      select: { id: true, displayName: true },
    });
    const isDirect = parsed.data.memberIds.length === 1;
    const directKey = isDirect
      ? canonicalUserPair(user.id, parsed.data.memberIds[0]).join(':')
      : null;
    const fallbackTitle = isDirect
      ? members.map((member) => member.displayName).join(' & ')
      : `${user.displayName}'s group`;
    const room = await this.prisma.liveSession.create({
      data: {
        hostId: user.id,
        title: parsed.data.title ?? fallbackTitle,
        kind: isDirect ? LiveSessionKind.direct : LiveSessionKind.group,
        directKey,
        participants: {
          create: allMemberIds.map((userId) => ({
            userId,
            status: ParticipantStatus.accepted,
            joinedAt: new Date(),
          })),
        },
      },
      include: roomInclude,
    });
    return this.toSummary(room);
  }

  async addMember(
    roomId: string,
    actorId: string,
    input: unknown,
  ): Promise<RoomSummary> {
    const parsed = addRoomMemberSchema.safeParse(input);
    if (!parsed.success) throw new ConflictException('Choose a valid friend.');
    const room = await this.requireMembership(roomId, actorId);
    const currentIds = room.participants.map((member) => member.userId);
    if (currentIds.includes(parsed.data.userId)) {
      throw new ConflictException('That friend is already in this room.');
    }
    if (currentIds.length >= 12) {
      throw new ConflictException('This room is full.');
    }
    await this.assertUsersExist([parsed.data.userId]);
    await this.assertFriendships(actorId, [parsed.data.userId]);

    const updated = await this.prisma.liveSession.update({
      where: { id: roomId },
      data: {
        kind: LiveSessionKind.group,
        directKey: null,
        title:
          room.kind === LiveSessionKind.direct
            ? 'Group conversation'
            : undefined,
        participants: {
          create: {
            userId: parsed.data.userId,
            status: ParticipantStatus.accepted,
            joinedAt: new Date(),
          },
        },
      },
      include: roomInclude,
    });
    return this.toSummary(updated);
  }

  async requireMembership(
    roomId: string,
    userId: string,
  ): Promise<RoomWithMembers> {
    const room = await this.prisma.liveSession.findFirst({
      where: {
        id: roomId,
        status: LiveSessionStatus.open,
        participants: {
          some: { userId, status: ParticipantStatus.accepted },
        },
      },
      include: roomInclude,
    });
    if (!room)
      throw new ForbiddenException('You are not a member of this room.');
    return room;
  }

  private async assertUsersExist(userIds: string[]): Promise<void> {
    const count = await this.prisma.user.count({
      where: { id: { in: userIds } },
    });
    if (count !== userIds.length)
      throw new NotFoundException('A selected user no longer exists.');
  }

  private async assertFriendships(
    inviterId: string,
    inviteeIds: string[],
  ): Promise<void> {
    const pairs = inviteeIds.map((inviteeId) => {
      const [userAId, userBId] = canonicalUserPair(inviterId, inviteeId);
      return { userAId, userBId };
    });
    const friendships = await this.prisma.friendship.count({
      where: { OR: pairs },
    });
    if (friendships !== pairs.length) {
      throw new ForbiddenException('You can only invite your friends.');
    }
  }

  private toSummary(room: RoomWithMembers): RoomSummary {
    return {
      id: room.id,
      title: room.title,
      kind: room.kind,
      hostId: room.hostId,
      createdAt: room.createdAt.toISOString(),
      members: room.participants.map(({ user }) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarStyle: user.avatarStyle,
        imageUrl: user.imageUrl,
      })),
    };
  }
}
