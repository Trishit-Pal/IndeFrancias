// src/lib/pwa/migrations.spec.ts
import { describe, it, expect } from 'vitest';
import { migrateBackup } from './migrations';
import { backupFileSchema } from './backupSchema';

const legacyV1 = {
	version: 1,
	exportedAt: '2026-01-01T00:00:00.000Z',
	settings: null,
	progress: [],
	srsCards: [],
	reviewLog: [],
	streak: [],
	stats: [],
	skillProfile: []
};

describe('migrateBackup', () => {
	it('wraps a legacy v1 flat backup into a valid v2 file', async () => {
		const migrated = await migrateBackup(legacyV1);
		expect(backupFileSchema.safeParse(migrated).success).toBe(true);
	});

	it('passes a v3 file through unchanged', async () => {
		const v3 = { schemaVersion: 3, exportedAt: 'now', checksum: 'x', payload: {} };
		expect(await migrateBackup(v3)).toBe(v3);
	});

	it('upgrades v2 to v3 with assessments array', async () => {
		const payload = {
			settings: null,
			progress: [],
			srsCards: [],
			reviewLog: [],
			streak: [],
			stats: [],
			skillProfile: []
		};
		const v2 = { schemaVersion: 2, exportedAt: 'now', checksum: 'old', payload };
		const migrated = (await migrateBackup(v2)) as {
			schemaVersion: number;
			payload: { assessments: unknown[] };
		};
		expect(migrated.schemaVersion).toBe(3);
		expect(migrated.payload.assessments).toEqual([]);
	});

	it('throws a version error for an unknown version', async () => {
		await expect(migrateBackup({ version: 999 })).rejects.toThrow(/version/i);
	});
});
