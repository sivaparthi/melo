import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type ClientToServerEvents,
  type CommandResult,
  joinRoomSchema,
  type Participant,
  type RoomSnapshot,
  type ServerToClientEvents,
  setEmotionSchema,
} from '@emote/contracts';
import { Server, Socket } from 'socket.io';
import { AuthService, SESSION_COOKIE_NAME } from './auth/auth.service';
import { RoomsService } from './rooms/rooms.service';

type SessionServer = Server<ClientToServerEvents, ServerToClientEvents>;
type SessionSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketIdentity {
  participantId: string;
  roomId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class SessionGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: SessionServer;

  private readonly rooms = new Map<string, Map<string, Participant>>();
  private readonly socketIdentities = new Map<string, SocketIdentity>();

  constructor(
    private readonly authService: AuthService,
    private readonly roomsService: RoomsService,
  ) {}

  @SubscribeMessage('room:join')
  async joinRoom(
    @MessageBody() payload: unknown,
    @ConnectedSocket() socket: SessionSocket,
  ): Promise<CommandResult> {
    const parsed = joinRoomSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid room or profile details.' };
    }

    const { roomId } = parsed.data;
    const token = this.readCookie(
      socket.handshake.headers.cookie,
      SESSION_COOKIE_NAME,
    );
    const user = token ? await this.authService.authenticate(token) : null;
    if (!user) return { ok: false, error: 'Sign in before joining a room.' };
    try {
      await this.roomsService.requireMembership(roomId, user.id);
    } catch {
      return { ok: false, error: 'You are not a member of this room.' };
    }

    const room = this.rooms.get(roomId) ?? new Map<string, Participant>();
    if (!room.has(user.id) && room.size >= 12) {
      return { ok: false, error: 'This room is full.' };
    }

    const previousRoomId = this.socketIdentities.get(socket.id)?.roomId;
    if (previousRoomId && previousRoomId !== roomId) {
      await socket.leave(previousRoomId);
    }

    room.set(user.id, {
      id: user.id,
      displayName: user.displayName,
      avatarStyle: user.avatarStyle,
      skinTone: user.skinTone,
      emotion: room.get(user.id)?.emotion ?? 'neutral',
      connected: true,
    });
    this.rooms.set(roomId, room);
    this.socketIdentities.set(socket.id, {
      participantId: user.id,
      roomId,
    });

    await socket.join(roomId);
    this.broadcastSnapshot(roomId);
    return { ok: true };
  }

  @SubscribeMessage('emotion:set')
  setEmotion(
    @MessageBody() payload: unknown,
    @ConnectedSocket() socket: SessionSocket,
  ): CommandResult {
    const parsed = setEmotionSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Choose a valid emotion.' };
    }

    const identity = this.socketIdentities.get(socket.id);
    if (!identity || identity.roomId !== parsed.data.roomId) {
      return { ok: false, error: 'Join this room before sharing an emotion.' };
    }

    const participant = this.rooms
      .get(identity.roomId)
      ?.get(identity.participantId);
    if (!participant) {
      return { ok: false, error: 'Your room membership could not be found.' };
    }

    participant.emotion = parsed.data.emotion;
    this.broadcastSnapshot(identity.roomId);
    return { ok: true };
  }

  handleDisconnect(socket: SessionSocket): void {
    const identity = this.socketIdentities.get(socket.id);
    if (!identity) {
      return;
    }

    const participant = this.rooms
      .get(identity.roomId)
      ?.get(identity.participantId);
    if (participant) {
      participant.connected = false;
      this.broadcastSnapshot(identity.roomId);
    }
    this.socketIdentities.delete(socket.id);
  }

  private broadcastSnapshot(roomId: string): void {
    const snapshot: RoomSnapshot = {
      roomId,
      participants: [...(this.rooms.get(roomId)?.values() ?? [])],
      serverTime: new Date().toISOString(),
    };
    this.server.to(roomId).emit('room:snapshot', snapshot);
  }

  private readCookie(header: string | undefined, name: string): string | null {
    if (!header) return null;
    for (const cookie of header.split(';')) {
      const separator = cookie.indexOf('=');
      if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
      try {
        return decodeURIComponent(cookie.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}
