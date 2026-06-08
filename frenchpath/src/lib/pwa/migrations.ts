// src/lib/pwa/migrations.ts
// Backup-file format migrations. Each step upgrades one version to the next;
// migrateBackup runs the chain up to CURRENT_BACKUP_VERSION. This is the single
// place the cross-version backup story lives — extend it when the format changes.
import { sha256Hex } from './checksum';
import { CURRENT_BACKUP_VERSION } from './backupSchema';

interface LegacyV1Backup {
	version: 1;
	exportedAt?: string;
	settings: unknown;
	progress: unknown[];
	srsCards: unknown[];
	reviewLog: unknown[];
	streak: unknown[];
	stats: unknown[];
	skillProfile: unknown[];
}

/** Reshapes the flat v1 backup into the v2 { schemaVersion, checksum, payload } wrapper. */
async function v1ToV2(old: LegacyV1Backup): Promise<unknown> {
	const payload = {
		settings: old.settings ?? null,
		progress: old.progress ?? [],
		srsCards: old.srsCards ?? [],
		reviewLog: old.reviewLog ?? [],
		streak: old.streak ?? [],
		stats: old.stats ?? [],
		skillProfile: old.skillProfile ?? []
	};
	return {
		schemaVersion: CURRENT_BACKUP_VERSION,
		exportedAt: old.exportedAt ?? '1970-01-01T00:00:00.000Z',
		checksum: await sha256Hex(JSON.stringify(payload)),
		payload
	};
}

/** Upgrades a parsed backup object to the current file version, or throws. */
export async function migrateBackup(
	raw: { version?: number; schemaVersion?: number } & Record<string, unknown>
): Promise<unknown> {
	const version = raw.schemaVersion ?? raw.version;
	if (version === CURRENT_BACKUP_VERSION) return raw;
	if (version === 1) return v1ToV2(raw as unknown as LegacyV1Backup);
	throw new Error(`Unsupported backup version: ${String(version)}`);
}
