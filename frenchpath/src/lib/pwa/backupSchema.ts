// src/lib/pwa/backupSchema.ts
// Validates backup files at the import boundary. Dates are stored as ISO
// strings in the JSON payload and revived to Date objects on write.
import { z } from 'zod';

const cefr = z.enum(['A1', 'A2', 'B1', 'B2', 'C1']);
const skill = z.enum(['listening', 'reading', 'spokenInteraction', 'spokenProduction', 'writing']);

export const settingsSchema = z.object({
	uiLanguage: z.enum(['en', 'hi', 'hinglish']),
	targetRetention: z.number(),
	dailyGoalXp: z.number(),
	ttsVoice: z.string().nullable(),
	audioSpeed: z.number(),
	theme: z.enum(['light', 'dark', 'system']),
	reduceMotion: z.boolean(),
	persistGranted: z.boolean(),
	onboarded: z.boolean()
});

export const progressSchema = z.object({
	lessonId: z.string().min(1),
	status: z.enum(['locked', 'available', 'completed']),
	score: z.number(),
	attempts: z.number(),
	lastVisited: z.number(),
	cefrLevel: cefr,
	bestCorrect: z.number().optional()
});

export const srsCardSchema = z.object({
	cardId: z.string().min(1),
	contentId: z.string(),
	cefrLevel: cefr,
	skill,
	due: z.string(),
	stability: z.number(),
	difficulty: z.number(),
	elapsed_days: z.number(),
	scheduled_days: z.number(),
	learning_steps: z.number(),
	reps: z.number(),
	lapses: z.number(),
	state: z.number(),
	last_review: z.string().optional(),
	lastGrade: z.number().optional(),
	schedulerVersion: z.string()
});

export const reviewLogSchema = z.object({
	id: z.number().optional(),
	cardId: z.string(),
	ts: z.number(),
	grade: z.number(),
	state: z.number(),
	stability: z.number(),
	difficulty: z.number(),
	elapsedDays: z.number(),
	scheduledDays: z.number(),
	reviewDurationMs: z.number().optional()
});

export const streakSchema = z.object({
	id: z.literal('streak'),
	currentStreak: z.number(),
	longestStreak: z.number(),
	lastActiveDate: z.string(),
	freezesAvailable: z.number(),
	freezesUsed: z.number()
});

export const statsSchema = z.object({
	date: z.string(),
	xp: z.number(),
	minutes: z.number(),
	lessonsCompleted: z.number(),
	reviewsDone: z.number()
});

export const skillProfileSchema = z.object({
	skill,
	estimatedLevel: cefr,
	updatedAt: z.number()
});

// Key order here is the canonical order used to compute the checksum.
export const backupPayloadSchema = z.object({
	settings: settingsSchema.nullable(),
	progress: z.array(progressSchema),
	srsCards: z.array(srsCardSchema),
	reviewLog: z.array(reviewLogSchema),
	streak: z.array(streakSchema),
	stats: z.array(statsSchema),
	skillProfile: z.array(skillProfileSchema)
});
export type BackupPayload = z.infer<typeof backupPayloadSchema>;

export const CURRENT_BACKUP_VERSION = 2;

export const backupFileSchema = z.object({
	schemaVersion: z.literal(CURRENT_BACKUP_VERSION),
	exportedAt: z.string(),
	checksum: z.string(),
	payload: backupPayloadSchema
});
export type BackupFile = z.infer<typeof backupFileSchema>;
