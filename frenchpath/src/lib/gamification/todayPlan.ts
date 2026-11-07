// Pure "Today" plan: picks one review, lesson or rest suggestion from the
// learner's due count, weakest skill, device capabilities and daily goal.
import type { CefrLevel, Skill, SkillProfileRecord } from '$lib/db/schema';
import type { DailyGoal } from './activity';
import { DEFAULT_REVIEW_BATCH } from '$lib/srs/queue';

export type ReviewMode = 'read' | 'listen' | 'type' | 'speak';
export interface Caps {
	tts: boolean;
	asr: boolean;
}

export const SECONDS_PER_CARD = 25;

const CEFR_ORDER: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
const SKILL_ORDER: readonly Skill[] = [
	'listening',
	'reading',
	'writing',
	'spokenProduction',
	'spokenInteraction'
];

/** Rank of a CEFR level; unknown levels rank as the lowest (A1). */
export function cefrIndex(level: string): number {
	const idx = CEFR_ORDER.indexOf(level as CefrLevel);
	return idx === -1 ? 0 : idx;
}

/** Lowest CEFR level wins; ties break in SKILL_ORDER. Null when there are no profiles. */
export function weakestSkill(profiles: readonly SkillProfileRecord[]): Skill | null {
	const sorted = [...profiles].sort(
		(a, b) =>
			cefrIndex(a.estimatedLevel) - cefrIndex(b.estimatedLevel) ||
			SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill)
	);
	return sorted[0]?.skill ?? null;
}

type FallbackHint = 'tts' | 'asr' | null;

/** Review mode for a focus skill, falling back when the device lacks TTS or ASR. */
export function focusMode(
	skill: Skill | null,
	caps: Caps
): { mode: ReviewMode; fallbackHint: 'tts' | 'asr' | null } {
	switch (skill) {
		case 'listening':
			return caps.tts
				? { mode: 'listen', fallbackHint: null }
				: { mode: 'read', fallbackHint: 'tts' };
		case 'writing':
			return { mode: 'type', fallbackHint: null };
		case 'spokenProduction':
		case 'spokenInteraction':
			// ponytail: spokenInteraction is not in the brief; treated as spoken production.
			return caps.asr
				? { mode: 'speak', fallbackHint: null }
				: { mode: 'type', fallbackHint: 'asr' };
		default:
			return { mode: 'read', fallbackHint: null };
	}
}

export interface TodayPlan {
	kind: 'review' | 'lesson' | 'rest';
	mode: ReviewMode;
	cardCount: number;
	minutes: number;
	fallbackHint: FallbackHint;
}

export interface TodayPlanInput {
	dueCount: number;
	focusSkill: Skill | null;
	caps: Caps;
	goal: DailyGoal;
	hasLessonsLeft: boolean;
}

function minutesFor(cardCount: number): number {
	if (cardCount <= 0) return 0;
	return Math.max(1, Math.round((cardCount * SECONDS_PER_CARD) / 60));
}

/** Due cards come first; otherwise a lesson while the goal is unmet, else rest. */
export function buildTodayPlan(input: TodayPlanInput): TodayPlan {
	const { mode, fallbackHint } = focusMode(input.focusSkill, input.caps);
	if (input.dueCount > 0) {
		const cardCount = Math.min(input.dueCount, DEFAULT_REVIEW_BATCH);
		return { kind: 'review', mode, cardCount, minutes: minutesFor(cardCount), fallbackHint };
	}
	const kind = !input.goal.met && input.hasLessonsLeft ? 'lesson' : 'rest';
	return { kind, mode, cardCount: 0, minutes: 0, fallbackHint };
}
