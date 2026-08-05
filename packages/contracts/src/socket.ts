import { z } from 'zod';
import { avatarStyleSchema, emotionIdSchema } from './emotions';

export const participantSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(1).max(40),
  avatarStyle: avatarStyleSchema,
  emotion: emotionIdSchema,
  connected: z.boolean(),
});
export type Participant = z.infer<typeof participantSchema>;

export const joinRoomSchema = z.object({
  roomId: z.string().trim().min(1),
});
export type JoinRoom = z.infer<typeof joinRoomSchema>;

export const setEmotionSchema = z.object({
  roomId: z.string().trim().min(3).max(32),
  emotion: emotionIdSchema,
});
export type SetEmotion = z.infer<typeof setEmotionSchema>;

export const roomSnapshotSchema = z.object({
  roomId: z.string(),
  participants: z.array(participantSchema).max(12),
  serverTime: z.string().datetime(),
});
export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>;

export interface ClientToServerEvents {
  'room:join': (payload: JoinRoom, acknowledge: (result: CommandResult) => void) => void;
  'emotion:set': (payload: SetEmotion, acknowledge: (result: CommandResult) => void) => void;
}

export interface ServerToClientEvents {
  'room:snapshot': (snapshot: RoomSnapshot) => void;
}

export type CommandResult =
  | { ok: true }
  | { ok: false; error: string };