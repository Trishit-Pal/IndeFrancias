// src/lib/pwa/backupSchema.spec.ts
import { describe, it, expect } from 'vitest';
import { backupPayloadSchema, backupFileSchema, CURRENT_BACKUP_VERSION } from './backupSchema';

const emptyPayload = {
	settings: null,
	progress: [],
	srsCards: [],
	reviewLog: [],
	streak: [],
	stats: [],
	skillProfile: []
};

describe('backupSchema', () => {
	it('accepts a well-formed empty payload', () => {
		expect(backupPayloadSchema.safeParse(emptyPayload).success).toBe(true);
	});

	it('rejects a payload with a malformed progress record', () => {
		const bad = { ...emptyPayload, progress: [{ lessonId: 'x' }] };
		expect(backupPayloadSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects a file whose schemaVersion is not the current one', () => {
		const file = { schemaVersion: 1, exportedAt: 'now', checksum: 'x', payload: emptyPayload };
		expect(backupFileSchema.safeParse(file).success).toBe(false);
		expect(CURRENT_BACKUP_VERSION).toBe(2);
	});
});
