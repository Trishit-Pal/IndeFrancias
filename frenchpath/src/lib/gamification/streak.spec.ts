import { describe, it, expect } from 'vitest';
import { effectiveStreak, updateStreak } from './streak';
import type { StreakRecord } from '../db/schema';

function base(overrides: Partial<StreakRecord> = {}): StreakRecord {
	return {
		id: 'streak',
		currentStreak: 0,
		longestStreak: 0,
		lastActiveDate: '',
		freezesAvailable: 3,
		freezesUsed: 0,
		...overrides
	};
}

describe('updateStreak', () => {
	it('starts a streak on first activity', () => {
		const s = updateStreak(base(), '2026-01-01');
		expect(s.currentStreak).toBe(1);
		expect(s.longestStreak).toBe(1);
		expect(s.lastActiveDate).toBe('2026-01-01');
	});

	it('is a no-op when already active today', () => {
		const s = base({ currentStreak: 3, longestStreak: 3, lastActiveDate: '2026-01-03' });
		expect(updateStreak(s, '2026-01-03')).toBe(s);
	});

	it('increments on a consecutive day and tracks the longest', () => {
		const s = updateStreak(
			base({ currentStreak: 3, longestStreak: 3, lastActiveDate: '2026-01-03' }),
			'2026-01-04'
		);
		expect(s.currentStreak).toBe(4);
		expect(s.longestStreak).toBe(4);
	});

	it('uses a freeze to bridge a single missed day', () => {
		const s = updateStreak(
			base({
				currentStreak: 5,
				longestStreak: 5,
				lastActiveDate: '2026-01-03',
				freezesAvailable: 2
			}),
			'2026-01-05'
		);
		expect(s.currentStreak).toBe(6);
		expect(s.freezesAvailable).toBe(1);
		expect(s.freezesUsed).toBe(1);
	});

	it('resets to 1 when a day is missed with no freeze available', () => {
		const s = updateStreak(
			base({
				currentStreak: 5,
				longestStreak: 5,
				lastActiveDate: '2026-01-03',
				freezesAvailable: 0
			}),
			'2026-01-05'
		);
		expect(s.currentStreak).toBe(1);
		expect(s.longestStreak).toBe(5);
		expect(s.freezesUsed).toBe(0);
	});

	it('resets when multiple days are missed even with freezes', () => {
		const s = updateStreak(
			base({
				currentStreak: 5,
				longestStreak: 5,
				lastActiveDate: '2026-01-01',
				freezesAvailable: 3
			}),
			'2026-01-05'
		);
		expect(s.currentStreak).toBe(1);
	});
});

describe('effectiveStreak', () => {
	const active = (overrides: Partial<StreakRecord> = {}) =>
		base({ currentStreak: 30, longestStreak: 30, lastActiveDate: '2026-01-10', ...overrides });

	it('is 0 when never active', () => {
		expect(effectiveStreak(base(), '2026-01-10')).toBe(0);
	});

	it('keeps the streak on the same day', () => {
		expect(effectiveStreak(active(), '2026-01-10')).toBe(30);
	});

	it('keeps the streak the day after', () => {
		expect(effectiveStreak(active(), '2026-01-11')).toBe(30);
	});

	it('keeps the streak after one missed day when a freeze can bridge it', () => {
		expect(effectiveStreak(active({ freezesAvailable: 1 }), '2026-01-12')).toBe(30);
	});

	it('is 0 after one missed day with no freeze', () => {
		expect(effectiveStreak(active({ freezesAvailable: 0 }), '2026-01-12')).toBe(0);
	});

	it('is 0 after a long idle gap even with freezes', () => {
		expect(effectiveStreak(active(), '2026-01-20')).toBe(0);
	});

	it('keeps the streak when the clock moved backwards', () => {
		expect(effectiveStreak(active(), '2026-01-08')).toBe(30);
	});
});
