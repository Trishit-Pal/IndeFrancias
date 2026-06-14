import type { UiLanguage } from '$lib/db/schema';

export const NATIVE_LANGUAGES = ['hi', 'bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'en'] as const;
export type NativeLanguage = (typeof NATIVE_LANGUAGES)[number];

export type LearningGoal = 'travel' | 'delf_a2' | 'delf_b2' | 'work' | 'heritage' | 'general';
export type DailyGoalPreset = 'casual' | 'regular' | 'intense';
export type CelebrationLevel = 'full' | 'minimal';

export const DAILY_GOAL_PRESET_XP: Record<DailyGoalPreset, number> = {
	casual: 20,
	regular: 50,
	intense: 100
};

/** Maps native language to default UI locale when supported. */
export const NATIVE_TO_UI: Partial<Record<NativeLanguage, UiLanguage>> = {
	hi: 'hi',
	en: 'en',
	bn: 'bn',
	ta: 'ta',
	te: 'te',
	kn: 'kn',
	mr: 'mr',
	gu: 'gu',
	pa: 'pa'
};

export const NATIVE_LANGUAGE_LABELS: Record<NativeLanguage, string> = {
	hi: 'हिन्दी',
	bn: 'বাংলা',
	ta: 'தமிழ்',
	te: 'తెలుగు',
	kn: 'ಕನ್ನಡ',
	mr: 'मराठी',
	gu: 'ગુજરાતી',
	pa: 'ਪੰਜਾਬੀ',
	en: 'English'
};

export interface LearnerProfileFields {
	nativeLanguage: NativeLanguage;
	learningGoal: LearningGoal;
	targetExamDate: string | null;
	dailyGoalPreset: DailyGoalPreset;
	showFrenchTips: boolean;
	celebrationLevel: CelebrationLevel;
	/** Future opt-in E2EE sync — always false at launch. */
	syncEnabled: boolean;
	revisionNotifications: boolean;
}

export const DEFAULT_PROFILE_FIELDS: Readonly<LearnerProfileFields> = {
	nativeLanguage: 'hi',
	learningGoal: 'general',
	targetExamDate: null,
	dailyGoalPreset: 'regular',
	showFrenchTips: true,
	celebrationLevel: 'full',
	syncEnabled: false,
	revisionNotifications: false
};

export function xpFromPreset(preset: DailyGoalPreset): number {
	return DAILY_GOAL_PRESET_XP[preset];
}
