import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus, Prisma } from '@prisma/client';
import {
  type FriendRequestView,
  type PublicProfile,
  resolveFriendRequestSchema,
  sendFriendRequestSchema,
  usernameSchema,
} from '@emote/contracts';
import { PrismaService } from '../prisma/prisma.service';

const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarStyle: true,
  imageUrl: true,
} satisfies Prisma.UserSelect;

export function canonicalUserPair(
  firstId: string,
  secondId: string,
): [string, string] {
  return firstId < secondId ? [firstId, secondId] : [secondId, firstId];
}

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async findUser(
    username: unknown,
    currentUserId: string,
  ): Promise<PublicProfile> {
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success)
      throw new NotFoundException('Enter an exact username.');
    const user = await this.prisma.user.findUnique({
      where: { username: parsed.data },
      select: publicUserSelect,
    });
    if (!user || user.id === currentUserId)
      throw new NotFoundException('No user found with that username.');
    return user;
  }

  async listFriends(userId: string): Promise<PublicProfile[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: publicUserSelect },
        userB: { select: publicUserSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
    return friendships.map((friendship) =>
      friendship.userAId === userId ? friendship.userB : friendship.userA,
    );
  }

  async listRequests(userId: string): Promise<FriendRequestView[]> {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        status: FriendRequestStatus.pending,
        OR: [{ requesterId: userId }, { recipientId: userId }],
      },
      include: {
        requester: { select: publicUserSelect },
        recipient: { select: publicUserSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((request) => ({
      id: request.id,
      direction: request.requesterId === userId ? 'outgoing' : 'incoming',
      status: request.status,
      user:
        request.requesterId === userId ? request.recipient : request.requester,
      createdAt: request.createdAt.toISOString(),
    }));
  }

  async sendRequest(
    userId: string,
    input: unknown,
  ): Promise<FriendRequestView> {
    const parsed = sendFriendRequestSchema.safeParse(input);
    if (!parsed.success)
      throw new ConflictException(
        parsed.error.issues[0]?.message ?? 'Invalid username.',
      );
    const recipient = await this.prisma.user.findUnique({
      where: { username: parsed.data.username },
      select: publicUserSelect,
    });
    if (!recipient)
      throw new NotFoundException('No user found with that username.');
    if (recipient.id === userId)
      throw new ConflictException(
        'You cannot send a friend request to yourself.',
      );

    const [userAId, userBId] = canonicalUserPair(userId, recipient.id);
    const [friendship, reverseRequest] = await Promise.all([
      this.prisma.friendship.findUnique({
        where: { userAId_userBId: { userAId, userBId } },
      }),
      this.prisma.friendRequest.findUnique({
        where: {
          requesterId_recipientId: {
            requesterId: recipient.id,
            recipientId: userId,
          },
        },
      }),
    ]);
    if (friendship) throw new ConflictException('You are already friends.');
    if (reverseRequest?.status === FriendRequestStatus.pending) {
      throw new ConflictException(
        'This person has already sent you a request.',
      );
    }

    const request = await this.prisma.friendRequest.upsert({
      where: {
        requesterId_recipientId: {
          requesterId: userId,
          recipientId: recipient.id,
        },
      },
      update: { status: FriendRequestStatus.pending },
      create: { requesterId: userId, recipientId: recipient.id },
    });
    return {
      id: request.id,
      direction: 'outgoing',
      status: request.status,
      user: recipient,
      createdAt: request.createdAt.toISOString(),
    };
  }

  async resolveRequest(
    userId: string,
    requestId: string,
    input: unknown,
  ): Promise<void> {
    const parsed = resolveFriendRequestSchema.safeParse(input);
    if (!parsed.success)
      throw new ConflictException('Choose accept or decline.');
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        recipientId: userId,
        status: FriendRequestStatus.pending,
      },
    });
    if (!request)
      throw new NotFoundException('Pending friend request not found.');

    if (parsed.data.action === 'decline') {
      await this.prisma.friendRequest.update({
        where: { id: request.id },
        data: { status: FriendRequestStatus.declined },
      });
      return;
    }

    const [userAId, userBId] = canonicalUserPair(
      request.requesterId,
      request.recipientId,
    );
    await this.prisma.$transaction([
      this.prisma.friendRequest.update({
        where: { id: request.id },
        data: { status: FriendRequestStatus.accepted },
      }),
      this.prisma.friendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        update: {},
        create: { userAId, userBId },
      }),
    ]);
  }

  async cancelRequest(userId: string, requestId: string): Promise<void> {
    const result = await this.prisma.friendRequest.updateMany({
      where: {
        id: requestId,
        requesterId: userId,
        status: FriendRequestStatus.pending,
      },
      data: { status: FriendRequestStatus.cancelled },
    });
    if (result.count === 0)
      throw new NotFoundException('Pending friend request not found.');
  }

  async unfriend(userId: string, friendId: string): Promise<void> {
    const [userAId, userBId] = canonicalUserPair(userId, friendId);
    const result = await this.prisma.friendship.deleteMany({
      where: { userAId, userBId },
    });
    if (result.count === 0)
      throw new NotFoundException('Friendship not found.');
  }
}
