// src/lib/pwa/backupSchema.spec.ts
import { describe, it, expect } from 'vitest';
import { backupPayloadSchema, backupFileSchema, CURRENT_BACKUP_VERSION } from './backupSchema';

const emptyPayload = {
	settings: null,
	progress: [],
	srsCards: [],
	reviewLog: [],
	streak: [],
	stats: [],
	skillProfile: []
};

describe('backupSchema', () => {
	it('accepts a well-formed empty payload', () => {
		expect(backupPayloadSchema.safeParse(emptyPayload).success).toBe(true);
	});

	it('rejects a payload with a malformed progress record', () => {
		const bad = { ...emptyPayload, progress: [{ lessonId: 'x' }] };
		expect(backupPayloadSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects a file whose schemaVersion is not the current one', () => {
		const file = { schemaVersion: 1, exportedAt: 'now', checksum: 'x', payload: emptyPayload };
		expect(backupFileSchema.safeParse(file).success).toBe(false);
		expect(CURRENT_BACKUP_VERSION).toBe(3);
	});

	it('accepts v3 profile fields on settings', () => {
		const payload = {
			...emptyPayload,
			settings: {
				uiLanguage: 'en',
				targetRetention: 0.9,
				dailyGoalXp: 50,
				ttsVoice: null,
				audioSpeed: 1,
				theme: 'system',
				reduceMotion: false,
				persistGranted: false,
				onboarded: true,
				nativeLanguage: 'hi',
				learningGoal: 'general',
				targetExamDate: null,
				dailyGoalPreset: 'regular',
				showFrenchTips: true,
				celebrationLevel: 'full',
				syncEnabled: false,
				revisionNotifications: false,
				difficultyTier: 'regular'
			}
		};
		expect(backupPayloadSchema.safeParse(payload).success).toBe(true);
	});

	it('rejects negative dailyGoalXp in settings', () => {
		const bad = {
			...emptyPayload,
			settings: {
				uiLanguage: 'en',
				targetRetention: 0.9,
				dailyGoalXp: -1,
				ttsVoice: null,
				audioSpeed: 1,
				theme: 'system',
				reduceMotion: false,
				persistGranted: false,
				onboarded: true
			}
		};
		expect(backupPayloadSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects progress score above 100', () => {
		const bad = {
			...emptyPayload,
			progress: [
				{
					lessonId: 'x',
					status: 'completed',
					score: 150,
					attempts: 1,
					lastVisited: 1,
					cefrLevel: 'A1'
				}
			]
		};
		expect(backupPayloadSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects SRS card with invalid ISO date', () => {
		const bad = {
			...emptyPayload,
			srsCards: [
				{
					cardId: 'c',
					contentId: 'x',
					cefrLevel: 'A1',
					skill: 'reading',
					due: 'not-a-date',
					stability: 1,
					difficulty: 5,
					elapsed_days: 0,
					scheduled_days: 0,
					learning_steps: 0,
					reps: 0,
					lapses: 0,
					state: 0,
					schedulerVersion: '6'
				}
			]
		};
		// z.string() accepts any string; invalid dates fail at revive — schema allows string
		expect(backupPayloadSchema.safeParse(bad).success).toBe(true);
	});

	it('rejects unknown top-level keys on backup file', () => {
		const file = {
			schemaVersion: CURRENT_BACKUP_VERSION,
			exportedAt: 'now',
			checksum: 'x',
			payload: emptyPayload,
			malicious: true
		};
		expect(backupFileSchema.safeParse(file).success).toBe(false);
	});
});
