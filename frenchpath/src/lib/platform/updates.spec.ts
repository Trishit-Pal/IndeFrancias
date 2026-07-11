import { describe, it, expect, vi, afterEach } from 'vitest';
import { compareVersions, checkForUpdate, UpdateCheckError } from './updates';

describe('compareVersions', () => {
	it('compares numerically, not lexicographically (1.2.0 vs 1.10.0)', () => {
		expect(compareVersions('1.2.0', '1.10.0')).toBe(-1);
	});

	it('tolerates a leading v prefix and treats it as equal-format', () => {
		expect(compareVersions('v2.0.0', '2.0.0')).toBe(0);
	});

	it('returns 1 when the first version is newer', () => {
		expect(compareVersions('0.0.2', '0.0.1')).toBe(1);
	});
});

describe('checkForUpdate', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns UpdateInfo when the fetched version is newer', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ version: '2.0.0', downloadUrl: 'https://example.com/dl' })
			})
		);
		const result = await checkForUpdate('1.0.0', 'https://example.com');
		expect(result).toEqual({ version: '2.0.0', downloadUrl: 'https://example.com/dl' });
	});

	it('returns null when the fetched version is the same', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ version: '1.0.0', downloadUrl: 'https://example.com/dl' })
			})
		);
		const result = await checkForUpdate('1.0.0', 'https://example.com');
		expect(result).toBeNull();
	});

	it('returns null when the fetched version is older', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ version: '0.9.0', downloadUrl: 'https://example.com/dl' })
			})
		);
		const result = await checkForUpdate('1.0.0', 'https://example.com');
		expect(result).toBeNull();
	});

	it('throws UpdateCheckError on malformed JSON shape', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ notVersion: 'oops' })
			})
		);
		await expect(checkForUpdate('1.0.0', 'https://example.com')).rejects.toBeInstanceOf(
			UpdateCheckError
		);
	});

	it('throws UpdateCheckError on HTTP failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				json: async () => ({})
			})
		);
		await expect(checkForUpdate('1.0.0', 'https://example.com')).rejects.toBeInstanceOf(
			UpdateCheckError
		);
	});

	it('throws UpdateCheckError on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
		await expect(checkForUpdate('1.0.0', 'https://example.com')).rejects.toBeInstanceOf(
			UpdateCheckError
		);
	});

	it('is not a generic Error instance check only — UpdateCheckError is distinguishable', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
		try {
			await checkForUpdate('1.0.0', 'https://example.com');
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(UpdateCheckError);
			expect((error as Error).name).toBe('UpdateCheckError');
		}
	});
});
