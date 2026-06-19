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

// ── Le Grand Voyage achievement catalog ──
// Pure metadata for the trophy/badge wall. Persisting which badges a learner
// has earned would require a new IndexedDB-backed settings field; that is left
// to a follow-up (the data layer is out of scope for this visual revamp).
export type BadgeId =
	| 'streak_7'
	| 'streak_30'
	| 'streak_100'
	| 'city_marseille'
	| 'city_lyon'
	| 'city_bordeaux'
	| 'city_paris'
	| 'perfect_lesson'
	| 'night_owl'
	| 'postcards_2'
	| 'postcards_6'
	| 'postcards_12'
	| 'delf_a2'
	| 'delf_b1'
	| 'vocab_100'
	| 'vocab_500'
	| 'coco_5'
	| 'coco_10';

export interface BadgeMeta {
	emoji: string;
	label: string;
	xp: number;
}

export const BADGE_CATALOG: Record<BadgeId, BadgeMeta> = {
	streak_7: { emoji: '🔥', label: '7-day streak', xp: 50 },
	streak_30: { emoji: '🔥', label: '30-day streak', xp: 200 },
	streak_100: { emoji: '🔥', label: '100-day streak', xp: 500 },
	city_marseille: { emoji: '⛵', label: 'Marseille', xp: 100 },
	city_lyon: { emoji: '🥖', label: 'Lyon', xp: 150 },
	city_bordeaux: { emoji: '🍇', label: 'Bordeaux', xp: 200 },
	city_paris: { emoji: '🗼', label: 'Paris', xp: 500 },
	perfect_lesson: { emoji: '🎯', label: 'Sans faute', xp: 25 },
	night_owl: { emoji: '🦉', label: 'Nuit blanche', xp: 30 },
	postcards_2: { emoji: '📮', label: '2 postcards', xp: 50 },
	postcards_6: { emoji: '📮', label: '6 postcards', xp: 100 },
	postcards_12: { emoji: '📮', label: 'Full collection', xp: 300 },
	delf_a2: { emoji: '🎓', label: 'DELF A2 passed', xp: 200 },
	delf_b1: { emoji: '🎓', label: 'DELF B1 passed', xp: 300 },
	vocab_100: { emoji: '💬', label: '100 words', xp: 50 },
	vocab_500: { emoji: '💬', label: '500 words', xp: 200 },
	coco_5: { emoji: '🍳', label: 'Coco Niveau 5', xp: 100 },
	coco_10: { emoji: '👨‍🍳', label: 'Coco Master Chef', xp: 500 }
};
