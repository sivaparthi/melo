import { z } from 'zod';
import { publicProfileSchema } from './accounts';

export const roomKindSchema = z.enum(['direct', 'group']);
export type RoomKind = z.infer<typeof roomKindSchema>;

export const roomSummarySchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(60),
  kind: roomKindSchema,
  hostId: z.string(),
  members: z.array(publicProfileSchema).max(12),
  createdAt: z.string().datetime(),
});
export type RoomSummary = z.infer<typeof roomSummarySchema>;

export const createRoomSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  memberIds: z.array(z.string()).min(1).max(11).refine(
    (ids) => new Set(ids).size === ids.length,
    'Choose each friend only once.',
  ),
});
export type CreateRoom = z.infer<typeof createRoomSchema>;

export const addRoomMemberSchema = z.object({
  userId: z.string().min(1),
});
export type AddRoomMember = z.infer<typeof addRoomMemberSchema>;