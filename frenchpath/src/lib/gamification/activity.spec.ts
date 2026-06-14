import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../db';
import * as statsRepo from '../db/repositories/stats';
import * as settingsRepo from '../db/repositories/settings';
import * as streakRepo from '../db/repositories/streak';
import { recordDailyActivity, dailyGoalProgress } from './activity';
import { todayKey } from '../utils/date';

beforeEach(async () => {
	await resetDatabase();
});

describe('recordDailyActivity', () => {
	it('advances the streak the first time it is called', async () => {
		await recordDailyActivity(new Date('2026-04-01T09:00:00'));
		expect((await streakRepo.getStreak()).currentStreak).toBe(1);
	});

	it('is idempotent within the same day', async () => {
		const now = new Date('2026-04-01T09:00:00');
		await recordDailyActivity(now);
		await recordDailyActivity(now);
		expect((await streakRepo.getStreak()).currentStreak).toBe(1);
	});
});

describe('dailyGoalProgress', () => {
	it('reports met=false below the goal and met=true at/above it', async () => {
		const now = new Date('2026-04-01T09:00:00');
		await settingsRepo.saveSettings({ dailyGoalXp: 30 });
		await statsRepo.addStats(todayKey(now), { xp: 20 });
		let goal = await dailyGoalProgress(now);
		expect(goal).toMatchObject({ xp: 20, goal: 30, met: false });
		await statsRepo.addStats(todayKey(now), { xp: 10 });
		goal = await dailyGoalProgress(now);
		expect(goal.met).toBe(true);
	});
});
