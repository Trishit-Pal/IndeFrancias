import { describe, it, expect } from 'vitest';
import { computeFsrsWeights, FSRS_OPTIMIZER_MIN_REVIEWS } from './optimizer';

describe('computeFsrsWeights', () => {
	it('returns null weights below review threshold', () => {
		const result = computeFsrsWeights(FSRS_OPTIMIZER_MIN_REVIEWS - 1);
		expect(result.weights).toBeNull();
		expect(result.reviewCount).toBe(FSRS_OPTIMIZER_MIN_REVIEWS - 1);
	});

	it('accepts threshold count without crashing', () => {
		const result = computeFsrsWeights(FSRS_OPTIMIZER_MIN_REVIEWS);
		expect(result.reviewCount).toBe(FSRS_OPTIMIZER_MIN_REVIEWS);
	});
});
