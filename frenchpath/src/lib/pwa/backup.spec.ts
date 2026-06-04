import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../db';
import * as srsRepo from '../db/repositories/srs';
import * as progressRepo from '../db/repositories/progress';
import * as settingsRepo from '../db/repositories/settings';
import { createSrsCard } from '../srs/fsrs';
import { exportBackup, importBackup } from './backup';

beforeEach(async () => {
	await resetDatabase();
});

describe('backup export/import', () => {
	it('round-trips data and revives Date fields on SRS cards', async () => {
		const now = new Date('2026-01-01T00:00:00Z');
		await srsRepo.putCard(
			createSrsCard({ cardId: 'u:1', contentId: '1', cefrLevel: 'A1', skill: 'reading', now })
		);
		await progressRepo.putProgress({
			lessonId: 'u',
			status: 'completed',
			score: 90,
			attempts: 1,
			lastVisited: 123,
			cefrLevel: 'A1'
		});
		await settingsRepo.saveSettings({ dailyGoalXp: 42 });

		const json = await exportBackup();
		await resetDatabase();
		expect(await srsRepo.getAllCards()).toHaveLength(0);

		await importBackup(json);

		const cards = await srsRepo.getAllCards();
		expect(cards).toHaveLength(1);
		expect(cards[0].due instanceof Date).toBe(true);
		expect((await progressRepo.getProgress('u'))?.score).toBe(90);
		expect((await settingsRepo.getSettings()).dailyGoalXp).toBe(42);
	});

	it('rejects an unsupported backup version', async () => {
		await expect(importBackup(JSON.stringify({ version: 999 }))).rejects.toThrow(/version/);
	});
});
