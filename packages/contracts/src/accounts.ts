import { z } from 'zod';
import { avatarStyleSchema, skinToneSchema } from './emotions';

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_]+$/, 'Use only lowercase letters, numbers, and underscores.');

export const publicProfileSchema = z.object({
  id: z.string(),
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(40),
  avatarStyle: avatarStyleSchema,
  skinTone: skinToneSchema,
  imageUrl: z.string().url().nullable(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const currentUserSchema = publicProfileSchema.extend({
  email: z.string().email(),
  profileCompleted: z.boolean(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
  avatarStyle: avatarStyleSchema.optional(),
  skinTone: skinToneSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, 'Provide at least one profile change.');
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

export const friendRequestStatusSchema = z.enum(['pending', 'accepted', 'declined', 'cancelled']);
export type FriendRequestStatus = z.infer<typeof friendRequestStatusSchema>;

export const friendRequestSchema = z.object({
  id: z.string(),
  direction: z.enum(['incoming', 'outgoing']),
  status: friendRequestStatusSchema,
  user: publicProfileSchema,
  createdAt: z.string().datetime(),
});
export type FriendRequestView = z.infer<typeof friendRequestSchema>;

export const sendFriendRequestSchema = z.object({
  username: usernameSchema,
});
export type SendFriendRequest = z.infer<typeof sendFriendRequestSchema>;

export const resolveFriendRequestSchema = z.object({
  action: z.enum(['accept', 'decline']),
});
export type ResolveFriendRequest = z.infer<typeof resolveFriendRequestSchema>;