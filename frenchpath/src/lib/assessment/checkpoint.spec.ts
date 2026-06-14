import { describe, it, expect } from 'vitest';
import {
	buildCheckpointPool,
	scoreCheckpoint,
	sampleExercises,
	xpForGate,
	gateById,
	MILESTONE_XP_BY_TIER
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
		const a = sampleExercises(pool, 5, 42);
		const b = sampleExercises(pool, 5, 42);
		expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
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
