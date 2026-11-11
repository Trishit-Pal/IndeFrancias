export type DataFileErrorCode =
	| 'backup_version_unsupported'
	| 'backup_checksum_mismatch'
	| 'backup_invalid'
	| 'backup_too_large'
	| 'backup_empty'
	| 'backup_not_json'
	| 'backup_export_refused'
	| 'backup_import_busy'
	| 'backup_restore_failed'
	| 'sync_too_large'
	| 'sync_not_json'
	| 'sync_import_busy'
	| 'sync_merge_failed'
	| 'sync_not_a_sync_file';

export type DataFileErrorParams = { kb?: number; maxMb?: number };

/** A refused backup or sync file. `message` stays the English sentence (logs, tests);
 *  `code` is what the interface translates. */
export class DataFileError extends Error {
	readonly code: DataFileErrorCode;
	/** Numbers a translated message needs (file size, limit). */
	readonly params: DataFileErrorParams;

	constructor(
		code: DataFileErrorCode,
		message: string,
		options?: { cause?: unknown; params?: DataFileErrorParams }
	) {
		super(message, options?.cause === undefined ? undefined : { cause: options.cause });
		this.name = 'DataFileError';
		this.code = code;
		this.params = options?.params ?? {};
	}
}
