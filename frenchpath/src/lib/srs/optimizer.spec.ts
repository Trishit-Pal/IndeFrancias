import { describe, it, expect } from 'vitest';
import {
	shouldRunOptimizer,
	FSRS_OPTIMIZER_MIN_REVIEWS,
	FSRS_OPTIMIZER_INTERVAL_MS
} from './optimizer';

describe('shouldRunOptimizer', () => {
	const NOW = 1_800_000_000_000;
	it('refuses below the review floor', () => {
		expect(shouldRunOptimizer(FSRS_OPTIMIZER_MIN_REVIEWS - 1, null, NOW)).toBe(false);
	});
	it('runs at the floor when never optimized', () => {
		expect(shouldRunOptimizer(FSRS_OPTIMIZER_MIN_REVIEWS, null, NOW)).toBe(true);
	});
	it('respects the weekly interval', () => {
		expect(shouldRunOptimizer(600, NOW - FSRS_OPTIMIZER_INTERVAL_MS + 1, NOW)).toBe(false);
		expect(shouldRunOptimizer(600, NOW - FSRS_OPTIMIZER_INTERVAL_MS - 1, NOW)).toBe(true);
	});
});
