import { describe, it, expect } from 'vitest';
import type { SkillProfileRecord } from '$lib/db/schema';
import type { DailyGoal } from './activity';
import { DEFAULT_REVIEW_BATCH } from '$lib/srs/queue';
import { SECONDS_PER_CARD, buildTodayPlan, focusMode, weakestSkill, type Caps } from './todayPlan';

const profile = (
	skill: SkillProfileRecord['skill'],
	estimatedLevel: SkillProfileRecord['estimatedLevel']
): SkillProfileRecord => ({ skill, estimatedLevel, updatedAt: 0 });

const allCaps: Caps = { tts: true, asr: true };
const noCaps: Caps = { tts: false, asr: false };
const goalUnmet: DailyGoal = { xp: 0, goal: 30, met: false };
const goalMet: DailyGoal = { xp: 30, goal: 30, met: true };

describe('weakestSkill', () => {
	it('returns the skill with the lowest CEFR level', () => {
		const profiles = [
			profile('reading', 'B1'),
			profile('writing', 'A2'),
			profile('listening', 'B2')
		];
		expect(weakestSkill(profiles)).toBe('writing');
	});

	it('breaks ties in the fixed skill order', () => {
		const profiles = [
			profile('writing', 'A1'),
			profile('spokenInteraction', 'A1'),
			profile('reading', 'A1'),
			profile('spokenProduction', 'A1'),
			profile('listening', 'A1')
		];
		expect(weakestSkill(profiles)).toBe('listening');
		expect(weakestSkill([profile('writing', 'A1'), profile('reading', 'A1')])).toBe('reading');
		expect(
			weakestSkill([profile('spokenInteraction', 'A1'), profile('spokenProduction', 'A1')])
		).toBe('spokenProduction');
	});

	it('returns null for an empty list', () => {
		expect(weakestSkill([])).toBeNull();
	});
});

describe('focusMode', () => {
	it('listening with tts available uses listen', () => {
		expect(focusMode('listening', allCaps)).toEqual({ mode: 'listen', fallbackHint: null });
	});

	it('listening without tts falls back to read with a tts hint', () => {
		expect(focusMode('listening', { tts: false, asr: true })).toEqual({
			mode: 'read',
			fallbackHint: 'tts'
		});
	});

	it('writing always uses type', () => {
		expect(focusMode('writing', noCaps)).toEqual({ mode: 'type', fallbackHint: null });
	});

	it('spokenProduction with asr uses speak', () => {
		expect(focusMode('spokenProduction', allCaps)).toEqual({ mode: 'speak', fallbackHint: null });
	});

	it('spokenProduction without asr falls back to type with an asr hint', () => {
		expect(focusMode('spokenProduction', { tts: true, asr: false })).toEqual({
			mode: 'type',
			fallbackHint: 'asr'
		});
	});

	it('reading uses read', () => {
		expect(focusMode('reading', noCaps)).toEqual({ mode: 'read', fallbackHint: null });
	});

	it('no focus skill uses read', () => {
		expect(focusMode(null, allCaps)).toEqual({ mode: 'read', fallbackHint: null });
	});
});

describe('buildTodayPlan', () => {
	it('with 30 due plans a review capped at the batch size', () => {
		const plan = buildTodayPlan({
			dueCount: 30,
			focusSkill: 'reading',
			caps: allCaps,
			goal: goalUnmet,
			hasLessonsLeft: true
		});
		expect(plan).toEqual({
			kind: 'review',
			mode: 'read',
			cardCount: DEFAULT_REVIEW_BATCH,
			minutes: Math.round((DEFAULT_REVIEW_BATCH * SECONDS_PER_CARD) / 60),
			fallbackHint: null
		});
	});

	it('with 0 due, goal unmet and lessons left plans a lesson', () => {
		const plan = buildTodayPlan({
			dueCount: 0,
			focusSkill: null,
			caps: allCaps,
			goal: goalUnmet,
			hasLessonsLeft: true
		});
		expect(plan.kind).toBe('lesson');
		expect(plan.cardCount).toBe(0);
		expect(plan.minutes).toBe(0);
	});

	it('with 0 due and goal met plans rest', () => {
		const plan = buildTodayPlan({
			dueCount: 0,
			focusSkill: null,
			caps: allCaps,
			goal: goalMet,
			hasLessonsLeft: true
		});
		expect(plan.kind).toBe('rest');
	});

	it('with 0 due, goal unmet and no lessons left plans rest', () => {
		const plan = buildTodayPlan({
			dueCount: 0,
			focusSkill: null,
			caps: allCaps,
			goal: goalUnmet,
			hasLessonsLeft: false
		});
		expect(plan.kind).toBe('rest');
	});

	it('keeps the focus mode and fallback hint on non-review plans', () => {
		const plan = buildTodayPlan({
			dueCount: 0,
			focusSkill: 'spokenProduction',
			caps: { tts: true, asr: false },
			goal: goalUnmet,
			hasLessonsLeft: true
		});
		expect(plan).toEqual({
			kind: 'lesson',
			mode: 'type',
			cardCount: 0,
			minutes: 0,
			fallbackHint: 'asr'
		});
	});

	it('gives at least one minute whenever there are cards', () => {
		const plan = buildTodayPlan({
			dueCount: 1,
			focusSkill: null,
			caps: allCaps,
			goal: goalUnmet,
			hasLessonsLeft: false
		});
		expect(plan.cardCount).toBe(1);
		expect(plan.minutes).toBe(1);
	});
});
