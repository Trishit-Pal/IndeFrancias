import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '$lib/db';
import { getStats } from '$lib/db/repositories/stats';
import { todayKey } from '$lib/utils/date';
import {
	buildCheckpointPool,
	scoreCheckpoint,
	sampleExercises,
	xpForGate,
	gateById,
	MILESTONE_XP_BY_TIER,
	awardAssessmentXp
} from './checkpoint';
import type { Unit } from '$lib/content/schema';

const unitFixture = (n: number): Unit => ({
	id: 'u1',
	cefrLevel: 'A1',
	order: 0,
	title: 't',
	objective: 'o',
	cards: [],
	exercises: Array.from({ length: n }, (_, i) => ({
		type: 'mcq' as const,
		id: `e${i}`,
		prompt: 'p',
		options: ['a', 'b'],
		answerIndex: 0
	}))
});

describe('assessment checkpoint', () => {
	it('samples exercises deterministically with seed', () => {
		const pool = unitFixture(20).exercises;
		const a = sampleExercises(pool, 5, 'seed-42');
		const b = sampleExercises(pool, 5, 'seed-42');
		expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
		expect(a).toHaveLength(5);
	});

	it('does not mutate its input and never returns more than the limit', () => {
		const pool = unitFixture(8).exercises;
		const before = pool.map((e) => e.id);
		expect(sampleExercises(pool, 20, 'x')).toHaveLength(8);
		expect(pool.map((e) => e.id)).toEqual(before);
	});

	it('draws every exercise about equally often across seeds', () => {
		const pool = unitFixture(36).exercises;
		const draws = 20_000;
		const picked = Array<number>(36).fill(0);
		for (let i = 0; i < draws; i++) {
			for (const e of sampleExercises(pool, 12, `seed-${i}`)) picked[Number(e.id.slice(1))]!++;
		}
		const expected = (draws * 12) / 36;
		expect(Math.min(...picked)).toBeGreaterThanOrEqual(expected * 0.85);
		expect(Math.max(...picked)).toBeLessThanOrEqual(expected * 1.15);
	});

	it('gives a retry a different draw than the first attempt, each stable', () => {
		const units = [unitFixture(36)];
		const ids = (attempt?: number) =>
			buildCheckpointPool(units, 'regular', 'g1', attempt).map((e) => e.id);
		const retry = 1_700_000_000_000;
		expect(ids(0)).toEqual(ids(0));
		expect(ids(retry)).toEqual(ids(retry));
		expect(ids(0)).not.toEqual(ids(retry));
		expect(ids()).toEqual(ids(0));
	});

	it('builds tier-sized checkpoint pool', () => {
		const pool = buildCheckpointPool([unitFixture(20)], 'regular', 'g1');
		expect(pool.length).toBe(12);
	});

	it('builds deterministic pool per gate id', () => {
		const units = [unitFixture(20)];
		const a = buildCheckpointPool(units, 'easy', 'g1');
		const b = buildCheckpointPool(units, 'easy', 'g1');
		expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
	});

	it('scores pass by tier threshold', () => {
		expect(scoreCheckpoint(7, 10, 'easy').passed).toBe(true);
		expect(scoreCheckpoint(6, 10, 'regular').passed).toBe(false);
		expect(scoreCheckpoint(8, 10, 'regular').passed).toBe(true);
	});

	it('awards milestone XP by tier', () => {
		expect(MILESTONE_XP_BY_TIER.hard).toBeGreaterThan(MILESTONE_XP_BY_TIER.easy);
	});

	it('resolves gate g1 for checkpoint route', () => {
		const gate = gateById('g1');
		expect(gate?.unitIds).toContain('a1-unit-03');
		expect(xpForGate(gate!, 'regular')).toBe(80);
	});
});

describe('awardAssessmentXp', () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it('awards XP exactly once when called twice concurrently', async () => {
		const results = await Promise.all([
			awardAssessmentXp('gate:g1', 'unit_checkpoint', 'g1', 90, 80),
			awardAssessmentXp('gate:g1', 'unit_checkpoint', 'g1', 90, 80)
		]);
		expect(results.filter((r) => r.awarded)).toHaveLength(1);
		expect((await getStats(todayKey())).xp).toBe(80);
	});
});
