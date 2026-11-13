import type { UiLanguage } from '$lib/db/schema';
import * as m from '$lib/paraglide/messages';

import { BETA_LOCALES, LANGUAGES, NATIVE_LANGUAGES, NATIVE_TO_UI } from '../i18n/languages';
import type { NativeLanguage } from '../i18n/languages';

export { BETA_LOCALES, NATIVE_LANGUAGES, NATIVE_TO_UI };
export type { NativeLanguage };

export type LearningGoal = 'travel' | 'delf_a2' | 'delf_b2' | 'work' | 'heritage' | 'general';
export type DailyGoalPreset = 'casual' | 'regular' | 'intense';
export type CelebrationLevel = 'full' | 'minimal';

export const DAILY_GOAL_PRESET_XP: Record<DailyGoalPreset, number> = {
	casual: 20,
	regular: 50,
	intense: 100
};

export const NATIVE_LANGUAGE_LABELS = Object.fromEntries(
	NATIVE_LANGUAGES.map((lang) => [lang, LANGUAGES[lang].label])
) as Record<NativeLanguage, string>;

/** Picker label for a UI language, suffixed "(beta)" for beta locales. */
export function uiLanguageLabel(lang: UiLanguage): string {
	const { label, beta } = LANGUAGES[lang];
	return beta ? `${label} ${m.language_beta_suffix()}` : label;
}

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
