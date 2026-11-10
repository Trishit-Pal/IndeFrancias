import { describe, expect, it } from 'vitest';
import { shouldShowBackupNudge } from './persist';

const NOW = Date.parse('2026-01-30T12:00:00Z');
const DAY_MS = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY_MS).toISOString();
const base = { persisted: false, lastExportAt: null, hasProgress: true, now: NOW };

describe('shouldShowBackupNudge', () => {
	it('shows when unprotected, never exported and there is progress', () => {
		expect(shouldShowBackupNudge(base)).toBe(true);
	});

	it('shows when the last export is older than 14 days', () => {
		expect(shouldShowBackupNudge({ ...base, lastExportAt: iso(15) })).toBe(true);
	});

	it('stays quiet after a recent export', () => {
		expect(shouldShowBackupNudge({ ...base, lastExportAt: iso(3) })).toBe(false);
	});

	it('stays quiet when storage is persistent', () => {
		expect(shouldShowBackupNudge({ ...base, persisted: true })).toBe(false);
	});

	it('stays quiet when there is nothing worth saving', () => {
		expect(shouldShowBackupNudge({ ...base, hasProgress: false })).toBe(false);
	});

	it('treats an unparseable export date as never exported', () => {
		expect(shouldShowBackupNudge({ ...base, lastExportAt: 'garbage' })).toBe(true);
	});
});
