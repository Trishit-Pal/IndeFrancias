import { describe, it, expect } from 'vitest';
import { scoreExam, objectiveSkillScore, productiveSkillScore } from './score';

describe('objectiveSkillScore', () => {
	it('scales correct/total to /25', () => {
		expect(objectiveSkillScore(4, 4)).toBe(25);
		expect(objectiveSkillScore(2, 4)).toBe(13); // 12.5 rounds to 13
		expect(objectiveSkillScore(0, 0)).toBe(0);
	});
});

describe('productiveSkillScore', () => {
	it('maps a 0–5 self-rating to /25 and clamps', () => {
		expect(productiveSkillScore(5)).toBe(25);
		expect(productiveSkillScore(3)).toBe(15);
		expect(productiveSkillScore(9)).toBe(25);
		expect(productiveSkillScore(-1)).toBe(0);
	});
});

describe('scoreExam', () => {
	it('passes when total ≥ 50 and every skill ≥ 5', () => {
		const r = scoreExam({ listening: 18, reading: 16, writing: 14, speaking: 12 });
		expect(r.total).toBe(60);
		expect(r.eliminated).toBe(false);
		expect(r.passed).toBe(true);
	});

	it('FAILS on the note éliminatoire even when total ≥ 50', () => {
		// 64/100 overall, but 4/25 in speaking → eliminated.
		const r = scoreExam({ listening: 22, reading: 22, writing: 16, speaking: 4 });
		expect(r.total).toBe(64);
		expect(r.eliminated).toBe(true);
		expect(r.passed).toBe(false);
	});

	it('fails when total is below 50', () => {
		const r = scoreExam({ listening: 10, reading: 10, writing: 10, speaking: 9 });
		expect(r.total).toBe(39);
		expect(r.passed).toBe(false);
	});
});
