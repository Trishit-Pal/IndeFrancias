// src/lib/pwa/backupSchema.ts
// Validates backup files at the import boundary. Dates are stored as ISO
// strings in the JSON payload and revived to Date objects on write.
import { z } from 'zod';

const cefr = z.enum(['A1', 'A2', 'B1', 'B2', 'C1']);
const skill = z.enum(['listening', 'reading', 'spokenInteraction', 'spokenProduction', 'writing']);

const nativeLanguage = z.enum(['hi', 'bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'en']);
const learningGoal = z.enum(['travel', 'delf_a2', 'delf_b2', 'work', 'heritage', 'general']);
const dailyGoalPreset = z.enum(['casual', 'regular', 'intense']);
const celebrationLevel = z.enum(['full', 'minimal']);
const difficultyTier = z.enum(['easy', 'regular', 'hard']);

export const settingsSchema = z.object({
	uiLanguage: z.enum(['en', 'hi', 'hinglish', 'bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa']),
	targetRetention: z.number(),
	dailyGoalXp: z.number().min(0),
	ttsVoice: z.string().nullable(),
	audioSpeed: z.number(),
	theme: z.enum(['light', 'dark', 'system']),
	reduceMotion: z.boolean(),
	persistGranted: z.boolean(),
	onboarded: z.boolean(),
	nativeLanguage: nativeLanguage.optional(),
	learningGoal: learningGoal.optional(),
	targetExamDate: z.string().nullable().optional(),
	dailyGoalPreset: dailyGoalPreset.optional(),
	showFrenchTips: z.boolean().optional(),
	celebrationLevel: celebrationLevel.optional(),
	syncEnabled: z.boolean().optional(),
	revisionNotifications: z.boolean().optional(),
	difficultyTier: difficultyTier.optional(),
	celebratedMilestones: z.array(z.number()).optional(),
	confidenceSnapshots: z
		.array(
			z.object({
				unitId: z.string(),
				index: z.number(),
				choice: z.enum(['low', 'ok', 'high'])
			})
		)
		.optional()
});

export const progressSchema = z.object({
	lessonId: z.string().min(1),
	status: z.enum(['locked', 'available', 'completed']),
	score: z.number().min(0).max(100),
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

export const assessmentSchema = z.object({
	assessmentId: z.string().min(1),
	kind: z.enum(['unit_checkpoint', 'cefr_milestone', 'delf_mock']),
	refId: z.string().min(1),
	score: z.number().min(0).max(100),
	xpAwarded: z.number().min(0),
	completedAt: z.number(),
	lastFailedAt: z.number().optional()
});

// Key order here is the canonical order used to compute the checksum.
export const backupPayloadSchema = z.object({
	settings: settingsSchema.nullable(),
	progress: z.array(progressSchema),
	srsCards: z.array(srsCardSchema),
	reviewLog: z.array(reviewLogSchema),
	streak: z.array(streakSchema),
	stats: z.array(statsSchema),
	skillProfile: z.array(skillProfileSchema),
	assessments: z.array(assessmentSchema).default([])
});
export type BackupPayload = z.infer<typeof backupPayloadSchema>;

export const CURRENT_BACKUP_VERSION = 3;

export const backupFileSchema = z
	.object({
		schemaVersion: z.literal(CURRENT_BACKUP_VERSION),
		exportedAt: z.string(),
		checksum: z.string(),
		payload: backupPayloadSchema
	})
	.strict();
export type BackupFile = z.infer<typeof backupFileSchema>;
