// Typed schema for the single on-device IndexedDB database.
// Everything the learner produces lives here — no account, no server.
import type { DBSchema } from 'idb';

export const DB_NAME = 'frenchpath';
export const DB_VERSION = 2;

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type Skill = 'listening' | 'reading' | 'spokenInteraction' | 'spokenProduction' | 'writing';

export type LessonStatus = 'locked' | 'available' | 'completed';

export type UiLanguage = 'en' | 'hi' | 'hinglish' | 'bn' | 'ta' | 'te' | 'kn' | 'mr' | 'gu' | 'pa';

export type Theme = 'light' | 'dark' | 'system';

export type NativeLanguage = 'hi' | 'bn' | 'ta' | 'te' | 'kn' | 'mr' | 'gu' | 'pa' | 'en';
export type LearningGoal = 'travel' | 'delf_a2' | 'delf_b2' | 'work' | 'heritage' | 'general';
export type DailyGoalPreset = 'casual' | 'regular' | 'intense';
export type CelebrationLevel = 'full' | 'minimal';
export type DifficultyTier = 'easy' | 'regular' | 'hard';

export type AssessmentKind = 'unit_checkpoint' | 'cefr_milestone' | 'delf_mock';

export interface ConfidenceSnapshot {
	unitId: string;
	index: number;
	choice: 'low' | 'ok' | 'high';
}

/** App settings — a single record stored under {@link SETTINGS_KEY}. */
export interface Settings {
	uiLanguage: UiLanguage;
	targetRetention: number;
	dailyGoalXp: number;
	ttsVoice: string | null;
	audioSpeed: number;
	theme: Theme;
	reduceMotion: boolean;
	persistGranted: boolean;
	onboarded: boolean;
	// --- learner profile (v2) ---
	nativeLanguage: NativeLanguage;
	learningGoal: LearningGoal;
	targetExamDate: string | null;
	dailyGoalPreset: DailyGoalPreset;
	showFrenchTips: boolean;
	celebrationLevel: CelebrationLevel;
	syncEnabled: boolean;
	revisionNotifications: boolean;
	difficultyTier: DifficultyTier;
	celebratedMilestones: number[];
	confidenceSnapshots?: ConfidenceSnapshot[];
}

export const SETTINGS_KEY = 'app';

export const DEFAULT_SETTINGS: Readonly<Settings> = {
	uiLanguage: 'en',
	targetRetention: 0.9,
	dailyGoalXp: 50,
	ttsVoice: null,
	audioSpeed: 1,
	theme: 'system',
	reduceMotion: false,
	persistGranted: false,
	onboarded: false,
	nativeLanguage: 'hi',
	learningGoal: 'general',
	targetExamDate: null,
	dailyGoalPreset: 'regular',
	showFrenchTips: true,
	celebrationLevel: 'full',
	syncEnabled: false,
	revisionNotifications: false,
	difficultyTier: 'regular',
	celebratedMilestones: [],
	confidenceSnapshots: []
};

/** Per-lesson completion state. */
export interface ProgressRecord {
	lessonId: string;
	status: LessonStatus;
	/** Best score achieved, 0–100. */
	score: number;
	/** Best correct-answer count achieved (drives improvement-delta XP). */
	bestCorrect?: number;
	attempts: number;
	/** Epoch milliseconds. */
	lastVisited: number;
	cefrLevel: CefrLevel;
}

/**
 * A spaced-repetition card: FSRS scheduler state plus app metadata.
 * The FSRS fields mirror ts-fsrs `Card` so conversion is a shallow copy.
 * Dates are stored as native Date objects (IndexedDB structured-clone safe,
 * and the `due` index supports range queries).
 */
export interface SrsCard {
	cardId: string;
	/** Id of the source content card (vocab/grammar item). */
	contentId: string;
	cefrLevel: CefrLevel;
	skill: Skill;
	// --- FSRS state (mirrors ts-fsrs Card) ---
	due: Date;
	stability: number;
	difficulty: number;
	elapsed_days: number;
	scheduled_days: number;
	learning_steps: number;
	reps: number;
	lapses: number;
	/** ts-fsrs State enum value: 0 New, 1 Learning, 2 Review, 3 Relearning. */
	state: number;
	last_review?: Date;
	// --- app metadata ---
	/** Last ts-fsrs Rating applied (1 Again … 4 Easy). */
	lastGrade?: number;
	/** ts-fsrs version string the card was scheduled with. */
	schedulerVersion: string;
}

/**
 * Immutable record of one review. Kept in full so FSRS parameters can be
 * optimised on-device later (the optimiser replays review history).
 */
export interface ReviewLogRecord {
	id?: number; // autoIncrement
	cardId: string;
	/** Epoch milliseconds when the review happened. */
	ts: number;
	/** ts-fsrs Rating (1 Again … 4 Easy). */
	grade: number;
	/** ts-fsrs State at review time. */
	state: number;
	stability: number;
	difficulty: number;
	elapsedDays: number;
	scheduledDays: number;
	/** Time the learner spent answering, ms — input to future optimisation. */
	reviewDurationMs?: number;
}

/** Singleton streak record (key {@link STREAK_KEY}). */
export interface StreakRecord {
	id: typeof STREAK_KEY;
	currentStreak: number;
	longestStreak: number;
	/** Local calendar day of last activity, YYYY-MM-DD. */
	lastActiveDate: string;
	freezesAvailable: number;
	freezesUsed: number;
}

export const STREAK_KEY = 'streak';

/** Per-day rollup for charts and forecasts. */
export interface DailyStats {
	date: string; // YYYY-MM-DD
	xp: number;
	minutes: number;
	lessonsCompleted: number;
	reviewsDone: number;
}

/** Estimated CEFR level per skill. */
export interface SkillProfileRecord {
	skill: Skill;
	estimatedLevel: CefrLevel;
	updatedAt: number;
}

/** One-time assessment completion (checkpoints, milestones, exams). */
export interface AssessmentRecord {
	assessmentId: string;
	kind: AssessmentKind;
	/** e.g. unit id or `a1-milestone` */
	refId: string;
	score: number;
	xpAwarded: number;
	completedAt: number;
	/** Epoch ms of most recent failed attempt (cooldown gate). */
	lastFailedAt?: number;
}

export interface FrenchPathDB extends DBSchema {
	settings: { key: string; value: Settings };
	progress: { key: string; value: ProgressRecord };
	srsCards: {
		key: string;
		value: SrsCard;
		indexes: { due: Date; cefrLevel: string; skill: string };
	};
	reviewLog: {
		key: number;
		value: ReviewLogRecord;
		indexes: { cardId: string; ts: number };
	};
	streak: { key: string; value: StreakRecord };
	stats: { key: string; value: DailyStats };
	skillProfile: { key: string; value: SkillProfileRecord };
	assessments: { key: string; value: AssessmentRecord };
}
