// Humane streak logic: a single missed day can be bridged by a freeze, so one
// off day doesn't erase weeks of progress. Pure + immutable for easy testing.
import type { StreakRecord } from '../db/schema';
import { daysBetween } from '../utils/date';

/** Applies a day of learning activity to the streak, returning a NEW record. */
export function updateStreak(streak: StreakRecord, today: string): StreakRecord {
	// Already counted today.
	if (streak.lastActiveDate === today) return streak;

	// First-ever activity.
	if (!streak.lastActiveDate) {
		return {
			...streak,
			currentStreak: 1,
			longestStreak: Math.max(1, streak.longestStreak),
			lastActiveDate: today
		};
	}

	const gap = daysBetween(streak.lastActiveDate, today);

	// Clock went backwards (e.g. timezone change) — treat as already counted.
	if (gap <= 0) return streak;

	// Consecutive day: extend the streak.
	if (gap === 1) {
		const currentStreak = streak.currentStreak + 1;
		return {
			...streak,
			currentStreak,
			longestStreak: Math.max(currentStreak, streak.longestStreak),
			lastActiveDate: today
		};
	}

	// Exactly one missed day, and a freeze is available: bridge it.
	if (gap === 2 && streak.freezesAvailable > 0) {
		const currentStreak = streak.currentStreak + 1;
		return {
			...streak,
			currentStreak,
			longestStreak: Math.max(currentStreak, streak.longestStreak),
			lastActiveDate: today,
			freezesAvailable: streak.freezesAvailable - 1,
			freezesUsed: streak.freezesUsed + 1
		};
	}

	// Streak broken: restart at 1 (longest is preserved).
	return {
		...streak,
		currentStreak: 1,
		longestStreak: Math.max(1, streak.longestStreak),
		lastActiveDate: today
	};
}
