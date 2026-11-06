import { describe, it, expect } from 'vitest';
import { LEECH_LAPSES, isLeech } from './leech';

describe('isLeech', () => {
	it('is false below the lapse threshold', () => {
		expect(isLeech({ lapses: LEECH_LAPSES - 1 })).toBe(false);
	});
	it('is true at the lapse threshold', () => {
		expect(LEECH_LAPSES).toBe(3);
		expect(isLeech({ lapses: 3 })).toBe(true);
	});
});
