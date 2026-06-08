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

	it('passes a v2 file through unchanged', async () => {
		const v2 = { schemaVersion: 2, exportedAt: 'now', checksum: 'x', payload: {} };
		expect(await migrateBackup(v2)).toBe(v2);
	});

	it('throws a version error for an unknown version', async () => {
		await expect(migrateBackup({ version: 999 })).rejects.toThrow(/version/i);
	});
});
