import * as m from '$lib/paraglide/messages';
import { FutureDatedSyncError } from '../sync/mergeFile';
import { WrongPassphraseError } from '../sync/crypto';
import { DataFileError, type DataFileErrorCode } from './dataFileError';

const MESSAGES: Record<DataFileErrorCode, (p: DataFileError['params']) => string> = {
	backup_version_unsupported: () => m.data_error_backup_version_unsupported(),
	backup_checksum_mismatch: () => m.data_error_backup_checksum_mismatch(),
	backup_invalid: () => m.data_error_backup_invalid(),
	backup_too_large: (p) => m.data_error_backup_too_large({ kb: p.kb ?? 0, maxMb: p.maxMb ?? 0 }),
	backup_empty: () => m.data_error_backup_empty(),
	backup_not_json: () => m.data_error_backup_not_json(),
	backup_export_refused: () => m.data_error_backup_export_refused(),
	backup_import_busy: () => m.data_error_backup_import_busy(),
	backup_restore_failed: () => m.data_error_backup_restore_failed(),
	sync_too_large: (p) => m.data_error_sync_too_large({ kb: p.kb ?? 0, maxMb: p.maxMb ?? 0 }),
	sync_not_json: () => m.data_error_sync_not_json(),
	sync_import_busy: () => m.data_error_sync_import_busy(),
	sync_merge_failed: () => m.data_error_sync_merge_failed(),
	sync_not_a_sync_file: () => m.data_error_sync_not_a_sync_file()
};

/** The learner-facing sentence for a refused backup or sync file, in the current language. */
export function dataFileMessage(error: unknown, fallback: string): string {
	if (error instanceof WrongPassphraseError) return m.sync_wrong_passphrase();
	if (error instanceof FutureDatedSyncError) return m.sync_future_dates();
	if (error instanceof DataFileError) return MESSAGES[error.code](error.params);
	return fallback;
}
