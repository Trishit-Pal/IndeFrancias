import { describe, it, expect } from 'vitest';
import {
	TIER_CONFIG,
	effectiveRetention,
	passedCheckpoint,
	scorePercent,
	MILESTONE_XP_BY_TIER
} from './tiers';

describe('difficulty tiers', () => {
	it('increases rigour from easy to hard', () => {
		expect(TIER_CONFIG.easy.passPercent).toBeLessThan(TIER_CONFIG.regular.passPercent);
		expect(TIER_CONFIG.regular.passPercent).toBeLessThan(TIER_CONFIG.hard.passPercent);
		expect(TIER_CONFIG.hard.questionCount).toBeGreaterThan(TIER_CONFIG.easy.questionCount);
	});

	it('offsets FSRS retention by tier', () => {
		expect(effectiveRetention(0.9, 'easy')).toBeGreaterThan(0.9);
		expect(effectiveRetention(0.9, 'hard')).toBeLessThan(0.9);
	});

	it('clamps effective retention to safe bounds', () => {
		expect(effectiveRetention(0.98, 'easy')).toBeLessThanOrEqual(0.99);
		expect(effectiveRetention(0.72, 'hard')).toBeGreaterThanOrEqual(0.7);
	});

	it('scores checkpoint pass by tier threshold', () => {
		expect(passedCheckpoint(6, 10, 'easy')).toBe(true);
		expect(passedCheckpoint(6, 10, 'regular')).toBe(false);
		expect(passedCheckpoint(8, 10, 'regular')).toBe(true);
	});

	it('computes score percent', () => {
		expect(scorePercent(3, 4)).toBe(75);
	});

	it('awards more milestone XP on hard tier', () => {
		expect(MILESTONE_XP_BY_TIER.hard).toBeGreaterThan(MILESTONE_XP_BY_TIER.easy);
	});
});
