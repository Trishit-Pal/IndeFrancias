import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from './db';
import * as streakRepo from './repositories/streak';
import * as skillProfileRepo from './repositories/skillProfile';
import * as progressRepo from './repositories/progress';

beforeEach(async () => {
	await resetDatabase();
});

describe('streak repository', () => {
	it('returns an initial streak, then persists updates', async () => {
		const initial = await streakRepo.getStreak();
		expect(initial.currentStreak).toBe(0);
		expect(initial.freezesAvailable).toBe(3);

		await streakRepo.putStreak({
			...initial,
			currentStreak: 5,
			longestStreak: 5,
			lastActiveDate: '2026-01-01'
		});
		expect((await streakRepo.getStreak()).currentStreak).toBe(5);
	});
});

describe('skillProfile repository', () => {
	it('stores, reads, and lists skill profiles', async () => {
		await skillProfileRepo.putSkillProfile({
			skill: 'reading',
			estimatedLevel: 'A1',
			updatedAt: 1
		});
		expect((await skillProfileRepo.getSkillProfile('reading'))?.estimatedLevel).toBe('A1');
		expect(await skillProfileRepo.getAllSkillProfiles()).toHaveLength(1);
	});
});

describe('progress repository', () => {
	it('lists all progress records', async () => {
		await progressRepo.putProgress({
			lessonId: 'a',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		await progressRepo.putProgress({
			lessonId: 'b',
			status: 'available',
			score: 0,
			attempts: 0,
			lastVisited: 2,
			cefrLevel: 'A1'
		});
		expect(await progressRepo.getAllProgress()).toHaveLength(2);
	});
});
