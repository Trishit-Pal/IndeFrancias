import { describe, it, expect } from 'vitest';
import { todayKey, daysBetween } from './date';

describe('todayKey', () => {
	it('formats a date as YYYY-MM-DD with zero padding', () => {
		expect(todayKey(new Date('2026-03-05T10:00:00'))).toBe('2026-03-05');
		expect(todayKey(new Date('2026-11-20T23:59:00'))).toBe('2026-11-20');
	});
});

describe('daysBetween', () => {
	it('counts whole days (signed) between two day keys', () => {
		expect(daysBetween('2026-01-01', '2026-01-04')).toBe(3);
		expect(daysBetween('2026-01-10', '2026-01-09')).toBe(-1);
		expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
	});
});
