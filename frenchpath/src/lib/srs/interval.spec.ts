import { describe, it, expect } from 'vitest';
import { formatInterval } from './interval';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatInterval', () => {
	it('uses minutes under an hour and never shows zero', () => {
		expect(formatInterval(10 * MIN, 'en')).toBe('10 min');
		expect(formatInterval(0, 'en')).toBe('1 min');
	});

	it('uses hours under a day', () => {
		expect(formatInterval(5 * HOUR, 'en')).toBe('5 hr');
	});

	it('uses days under a month', () => {
		expect(formatInterval(DAY, 'en')).toBe('1 day');
		expect(formatInterval(4 * DAY, 'en')).toBe('4 days');
	});

	it('uses months under a year, then years', () => {
		// the unit abbreviation varies by ICU version, so only the number is pinned
		expect(formatInterval(90 * DAY, 'en')).toMatch(/^3\s\D+$/);
		expect(formatInterval(730 * DAY, 'en')).toMatch(/^2\s\D+$/);
	});

	it('moves up a unit instead of showing 60 min, 24 hr or 30 days', () => {
		expect(formatInterval(59.6 * MIN, 'en')).toBe('1 hr');
		expect(formatInterval(23.6 * HOUR, 'en')).toBe('1 day');
		expect(formatInterval(29.6 * DAY, 'en')).toMatch(/^1\s\D+$/);
		expect(formatInterval(29.6 * DAY, 'en')).not.toContain('day');
	});

	it('writes the unit in the interface language', () => {
		expect(formatInterval(4 * DAY, 'hi')).toMatch(/[ऀ-ॿ]/);
	});

	it('keeps Latin digits where the locale would use its own numerals', () => {
		expect(formatInterval(10 * MIN, 'bn')).toMatch(/^10\s/);
		expect(formatInterval(4 * DAY, 'mr')).toMatch(/^4\s/);
	});
});
