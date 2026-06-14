import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../db';
import * as srsRepo from '../db/repositories/srs';
import * as progressRepo from '../db/repositories/progress';
import * as settingsRepo from '../db/repositories/settings';
import * as assessmentsRepo from '../db/repositories/assessments';
import { createSrsCard } from '../srs/fsrs';
import { exportBackup, importBackup, previewBackup, MAX_BACKUP_BYTES } from './backup';
import { sha256Hex } from './checksum';
import { CURRENT_BACKUP_VERSION } from './backupSchema';

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

	it('rejects a tampered checksum and leaves existing data intact', async () => {
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const json = await exportBackup();
		const file = JSON.parse(json);
		file.checksum = 'deadbeef'; // tamper
		await expect(importBackup(JSON.stringify(file))).rejects.toThrow(/checksum|integrity/i);
		// existing data must NOT have been cleared
		expect((await progressRepo.getProgress('keep'))?.score).toBe(80);
	});

	it('rejects a malformed record without clearing existing data', async () => {
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const json = await exportBackup();
		const file = JSON.parse(json);
		file.payload.progress = [{ lessonId: 5 }]; // wrong shape
		file.checksum = await sha256Hex(JSON.stringify(file.payload));
		await expect(importBackup(JSON.stringify(file))).rejects.toThrow(/invalid/i);
		expect((await progressRepo.getProgress('keep'))?.score).toBe(80);
	});

	it('restores a legacy v1 backup via migration', async () => {
		const legacy = {
			version: 1,
			exportedAt: '2026-01-01T00:00:00.000Z',
			settings: null,
			progress: [
				{
					lessonId: 'old',
					status: 'completed',
					score: 70,
					attempts: 1,
					lastVisited: 1,
					cefrLevel: 'A1'
				}
			],
			srsCards: [],
			reviewLog: [],
			streak: [],
			stats: [],
			skillProfile: []
		};
		await importBackup(JSON.stringify(legacy));
		expect((await progressRepo.getProgress('old'))?.score).toBe(70);
	});

	it('rejects empty and invalid JSON before touching the database', async () => {
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		await expect(importBackup('')).rejects.toThrow(/empty/i);
		await expect(importBackup('{not json')).rejects.toThrow(/valid JSON/i);
		expect((await progressRepo.getProgress('keep'))?.score).toBe(80);
	});

	it('rejects truncated JSON mid-object', async () => {
		await expect(importBackup('{"schemaVersion":2,"payload":{')).rejects.toThrow(/valid JSON/i);
	});

	it('rejects oversized backups before parsing', async () => {
		const huge = 'x'.repeat(MAX_BACKUP_BYTES + 1);
		await expect(importBackup(huge)).rejects.toThrow(/too large/i);
	});

	it('preserves checksum identity on export → re-import round-trip', async () => {
		await progressRepo.putProgress({
			lessonId: 'rt',
			status: 'completed',
			score: 100,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const exported = await exportBackup();
		const parsed = JSON.parse(exported);
		expect(parsed.schemaVersion).toBe(CURRENT_BACKUP_VERSION);
		const recomputed = await sha256Hex(JSON.stringify(parsed.payload));
		expect(parsed.checksum).toBe(recomputed);
		await resetDatabase();
		await importBackup(exported);
		expect((await progressRepo.getProgress('rt'))?.score).toBe(100);
	});

	it('rejects unknown top-level keys on v2 files', async () => {
		const json = await exportBackup();
		const file = JSON.parse(json);
		file.extraKey = 'hostile';
		file.checksum = await sha256Hex(JSON.stringify(file.payload));
		await expect(importBackup(JSON.stringify(file))).rejects.toThrow(/invalid/i);
	});

	it('rejects concurrent import attempts', async () => {
		const json = await exportBackup();
		const first = importBackup(json);
		await expect(importBackup(json)).rejects.toThrow(/already in progress/i);
		await first;
	});

	it('previewBackup returns counts without mutating the database', async () => {
		await progressRepo.putProgress({
			lessonId: 'p1',
			status: 'completed',
			score: 90,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const json = await exportBackup();
		const preview = await previewBackup(json);
		expect(preview.lessonCount).toBe(1);
		expect(preview.exportedAt).toBeTruthy();
	});

	it('round-trips assessments store', async () => {
		await assessmentsRepo.saveAssessment({
			assessmentId: 'checkpoint:g1',
			kind: 'unit_checkpoint',
			refId: 'g1',
			score: 85,
			xpAwarded: 80,
			completedAt: Date.now()
		});
		const json = await exportBackup();
		await resetDatabase();
		await importBackup(json);
		const list = await assessmentsRepo.listAssessments();
		expect(list).toHaveLength(1);
		expect(list[0]?.assessmentId).toBe('checkpoint:g1');
	});

	it('previewBackup rejects schema-invalid payload after checksum', async () => {
		const json = await exportBackup();
		const file = JSON.parse(json);
		file.payload.progress = [{ lessonId: 5 }];
		file.checksum = await sha256Hex(JSON.stringify(file.payload));
		await expect(previewBackup(JSON.stringify(file))).rejects.toThrow(/invalid/i);
	});
});
