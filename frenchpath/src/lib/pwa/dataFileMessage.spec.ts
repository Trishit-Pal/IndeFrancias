import { describe, it, expect } from 'vitest';
import { importBackup, MAX_BACKUP_BYTES } from './backup';
import { previewSyncMerge } from '../sync/mergeFile';
import { WrongPassphraseError } from '../sync/crypto';
import { FutureDatedSyncError } from '../sync/mergeFile';
import { DataFileError, type DataFileErrorCode } from './dataFileError';
import { dataFileMessage } from './dataFileMessage';
import * as m from '$lib/paraglide/messages';

async function caught(run: () => Promise<unknown>): Promise<unknown> {
	try {
		await run();
	} catch (error) {
		return error;
	}
	throw new Error('expected the call to throw');
}

function expectCode(error: unknown, code: DataFileErrorCode): DataFileError {
	expect(error).toBeInstanceOf(DataFileError);
	expect((error as DataFileError).code).toBe(code);
	return error as DataFileError;
}

describe('refused files throw a coded DataFileError', () => {
	it('empty backup', async () => {
		expectCode(await caught(() => importBackup('')), 'backup_empty');
	});
	it('backup that is not JSON', async () => {
		expectCode(await caught(() => importBackup('{not json')), 'backup_not_json');
	});
	it('backup of an unknown version', async () => {
		const error = await caught(() => importBackup(JSON.stringify({ version: 999 })));
		expectCode(error, 'backup_version_unsupported');
	});
	it('oversized backup carries the numbers', async () => {
		const error = await caught(() => importBackup('x'.repeat(MAX_BACKUP_BYTES + 1)));
		const e = expectCode(error, 'backup_too_large');
		expect(typeof e.params.kb).toBe('number');
		expect(typeof e.params.maxMb).toBe('number');
	});
	it('sync file that is not JSON', async () => {
		expectCode(await caught(() => previewSyncMerge('not json at all', 'pw')), 'sync_not_json');
	});
	it('JSON that is not a sync envelope', async () => {
		expectCode(await caught(() => previewSyncMerge('{"a":1}', 'pw')), 'sync_not_a_sync_file');
	});
});

describe('dataFileMessage', () => {
	it('uses the message for the error code', () => {
		const error = new DataFileError('backup_not_json', 'Backup file is not valid JSON.');
		expect(dataFileMessage(error, 'fallback')).toBe(m.data_error_backup_not_json());
	});
	it('puts the numbers into the too-large message', () => {
		const error = new DataFileError('backup_too_large', 'x', { params: { kb: 12345, maxMb: 50 } });
		const text = dataFileMessage(error, 'fallback');
		expect(text).toContain('12345');
		expect(text).toContain('50');
	});
	it('keeps the passphrase and future-date messages', () => {
		expect(dataFileMessage(new WrongPassphraseError(), 'f')).toBe(m.sync_wrong_passphrase());
		expect(dataFileMessage(new FutureDatedSyncError(), 'f')).toBe(m.sync_future_dates());
	});
	it('falls back for a plain Error and for a non-error', () => {
		expect(dataFileMessage(new Error('raw English'), 'fallback')).toBe('fallback');
		expect(dataFileMessage('oops', 'fallback')).toBe('fallback');
	});
});
