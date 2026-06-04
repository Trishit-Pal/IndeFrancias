// Ties learning activity to the retention loop: updates the daily streak and
// reports daily-goal progress. Called from lesson completion and reviews.
import { streakRepo, statsRepo, settingsRepo } from '../db';
import { updateStreak } from './streak';
import { todayKey } from '../utils/date';

/** Records that the learner was active today, advancing the streak once per day. */
export async function recordDailyActivity(now: Date = new Date()): Promise<void> {
	const streak = await streakRepo.getStreak();
	const updated = updateStreak(streak, todayKey(now));
	if (updated !== streak) await streakRepo.putStreak(updated);
}

export interface DailyGoal {
	xp: number;
	goal: number;
	met: boolean;
}

/** Today's XP against the configured daily goal. */
export async function dailyGoalProgress(now: Date = new Date()): Promise<DailyGoal> {
	const [stats, settings] = await Promise.all([
		statsRepo.getStats(todayKey(now)),
		settingsRepo.getSettings()
	]);
	return { xp: stats.xp, goal: settings.dailyGoalXp, met: stats.xp >= settings.dailyGoalXp };
}
