import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './schema';
import { xpFromPreset } from '$lib/profile/types';

describe('learner profile defaults', () => {
	it('includes v2 profile fields with safe defaults', () => {
		expect(DEFAULT_SETTINGS.nativeLanguage).toBe('hi');
		expect(DEFAULT_SETTINGS.learningGoal).toBe('general');
		expect(DEFAULT_SETTINGS.dailyGoalPreset).toBe('regular');
		expect(DEFAULT_SETTINGS.dailyGoalXp).toBe(50);
		expect(DEFAULT_SETTINGS.syncEnabled).toBe(false);
		expect(DEFAULT_SETTINGS.difficultyTier).toBe('regular');
		expect(DEFAULT_SETTINGS.showFrenchTips).toBe(true);
		expect(DEFAULT_SETTINGS.celebrationLevel).toBe('full');
		expect(DEFAULT_SETTINGS.revisionNotifications).toBe(false);
	});

	it('maps daily presets to XP targets', () => {
		expect(xpFromPreset('casual')).toBe(20);
		expect(xpFromPreset('regular')).toBe(50);
		expect(xpFromPreset('intense')).toBe(100);
	});
});
