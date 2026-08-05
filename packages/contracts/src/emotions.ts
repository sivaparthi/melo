import { z } from 'zod';

export const avatarStyleSchema = z.enum(['male', 'female']);
export type AvatarStyle = z.infer<typeof avatarStyleSchema>;

export const emotionIds = [
  'neutral',
  'joy',
  'excitement',
  'appreciation',
  'calm',
  'pride',
  'surprise',
  'confusion',
  'embarrassment',
  'sadness',
  'loneliness',
  'tiredness',
  'anxiety',
  'fear',
  'frustration',
  'anger',
] as const;

export const emotionIdSchema = z.enum(emotionIds);
export type EmotionId = z.infer<typeof emotionIdSchema>;

export type EmotionCategory = 'uplifted' | 'steady' | 'uncertain' | 'low' | 'intense';

export interface EmotionDefinition {
  id: EmotionId;
  label: string;
  category: EmotionCategory;
  symbol: string;
  description: string;
}

export const emotions: readonly EmotionDefinition[] = [
  { id: 'neutral', label: 'Neutral', category: 'steady', symbol: '•', description: 'Feeling balanced or undecided' },
  { id: 'joy', label: 'Joy', category: 'uplifted', symbol: '☀', description: 'Feeling happy and bright' },
  { id: 'excitement', label: 'Excited', category: 'uplifted', symbol: '✦', description: 'Feeling energized and eager' },
  { id: 'appreciation', label: 'Grateful', category: 'uplifted', symbol: '♥', description: 'Feeling thankful and connected' },
  { id: 'calm', label: 'Calm', category: 'steady', symbol: '≈', description: 'Feeling peaceful and settled' },
  { id: 'pride', label: 'Proud', category: 'uplifted', symbol: '↑', description: 'Feeling accomplished and confident' },
  { id: 'surprise', label: 'Surprised', category: 'uncertain', symbol: '!', description: 'Feeling caught off guard' },
  { id: 'confusion', label: 'Confused', category: 'uncertain', symbol: '?', description: 'Feeling unsure or unclear' },
  { id: 'embarrassment', label: 'Embarrassed', category: 'uncertain', symbol: '…', description: 'Feeling self-conscious or awkward' },
  { id: 'sadness', label: 'Sad', category: 'low', symbol: '↓', description: 'Feeling unhappy or heavy' },
  { id: 'loneliness', label: 'Lonely', category: 'low', symbol: '○', description: 'Feeling alone or disconnected' },
  { id: 'tiredness', label: 'Tired', category: 'low', symbol: '−', description: 'Feeling low on energy' },
  { id: 'anxiety', label: 'Anxious', category: 'intense', symbol: '≋', description: 'Feeling worried or unsettled' },
  { id: 'fear', label: 'Afraid', category: 'intense', symbol: '△', description: 'Feeling unsafe or frightened' },
  { id: 'frustration', label: 'Frustrated', category: 'intense', symbol: '×', description: 'Feeling blocked or irritated' },
  { id: 'anger', label: 'Angry', category: 'intense', symbol: '⚡', description: 'Feeling strong displeasure or anger' },
] as const;

export const emotionById = Object.fromEntries(
  emotions.map((emotion) => [emotion.id, emotion]),
) as Record<EmotionId, EmotionDefinition>;