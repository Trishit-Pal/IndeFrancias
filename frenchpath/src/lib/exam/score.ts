// DELF/DALF scoring: 4 skills × 25 = 100. Pass = 50/100, BUT a *note
// éliminatoire* fails the whole exam if any single skill is below 5/25 —
// so 64/100 with 4/25 in one skill is still a fail.
import type { ExamSkill } from './types';

export const MAX_PER_SKILL = 25;
export const PASS_TOTAL = 50;
export const ELIMINATORY_MIN = 5;

const SKILLS: ExamSkill[] = ['listening', 'reading', 'writing', 'speaking'];

export interface ExamResult {
	perSkill: Record<ExamSkill, number>;
	total: number;
	passed: boolean;
	/** True if any skill fell below the éliminatoire threshold. */
	eliminated: boolean;
}

/** Scales an auto-graded section (correct/total) to a /25 skill score. */
export function objectiveSkillScore(correct: number, total: number): number {
	return total === 0 ? 0 : Math.round((correct / total) * MAX_PER_SKILL);
}

/** Maps a 0–5 self-rating to a /25 productive-skill score. */
export function productiveSkillScore(selfRating: number): number {
	const clamped = Math.max(0, Math.min(5, selfRating));
	return clamped * 5;
}

export function scoreExam(perSkill: Record<ExamSkill, number>): ExamResult {
	const total = SKILLS.reduce((sum, skill) => sum + (perSkill[skill] ?? 0), 0);
	const eliminated = SKILLS.some((skill) => (perSkill[skill] ?? 0) < ELIMINATORY_MIN);
	return { perSkill, total, passed: total >= PASS_TOTAL && !eliminated, eliminated };
}
