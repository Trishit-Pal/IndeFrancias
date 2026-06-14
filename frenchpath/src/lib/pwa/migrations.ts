// src/lib/pwa/migrations.ts
// Backup-file format migrations. Each step upgrades one version to the next;
// migrateBackup runs the chain up to CURRENT_BACKUP_VERSION.
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

interface V2Backup {
	schemaVersion: 2;
	exportedAt: string;
	checksum: string;
	payload: {
		settings: unknown;
		progress: unknown[];
		srsCards: unknown[];
		reviewLog: unknown[];
		streak: unknown[];
		stats: unknown[];
		skillProfile: unknown[];
	};
}

/** Reshapes the flat v1 backup into the v2 { schemaVersion, checksum, payload } wrapper. */
async function v1ToV2(old: LegacyV1Backup): Promise<V2Backup> {
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
		schemaVersion: 2,
		exportedAt: old.exportedAt ?? '1970-01-01T00:00:00.000Z',
		checksum: await sha256Hex(JSON.stringify(payload)),
		payload
	};
}

/** Adds assessments array for learner profile / checkpoint data (v3). */
async function v2ToV3(old: V2Backup): Promise<unknown> {
	const payload = {
		...old.payload,
		assessments: [] as unknown[]
	};
	return {
		schemaVersion: CURRENT_BACKUP_VERSION,
		exportedAt: old.exportedAt,
		checksum: await sha256Hex(JSON.stringify(payload)),
		payload
	};
}

/** Upgrades a parsed backup object to the current file version, or throws. */
export async function migrateBackup(
	raw: { version?: number; schemaVersion?: number } & Record<string, unknown>
): Promise<unknown> {
	let version = raw.schemaVersion ?? raw.version;
	let current: unknown = raw;

	if (version === 1) {
		current = await v1ToV2(raw as unknown as LegacyV1Backup);
		version = 2;
	}
	if (version === 2) {
		current = await v2ToV3(current as V2Backup);
		version = CURRENT_BACKUP_VERSION;
	}
	if (version === CURRENT_BACKUP_VERSION) return current;
	throw new Error(`Unsupported backup version: ${String(version)}`);
}
