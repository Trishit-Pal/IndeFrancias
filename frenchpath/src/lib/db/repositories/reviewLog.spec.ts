import { describe, it, expect } from 'vitest';
import * as reviewLogRepo from './reviewLog';

describe('reviewLog repository immutability', () => {
	it('exposes append-only APIs (no update or delete)', () => {
		const exports = Object.keys(reviewLogRepo).sort();
		expect(exports).toEqual(['appendReviewLog', 'countReviews', 'getLogsForCard']);
	});
});
