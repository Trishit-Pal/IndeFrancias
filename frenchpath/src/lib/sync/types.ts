/**
 * E2EE sync envelope — architecture stub for optional future cloud sync.
 * @deprecated Not wired to anything shipped. File-based sync lives in
 * `./mergeFile.ts` (export/preview/import via `./crypto.ts` envelopes).
 */

export interface SyncEnvelope {
	version: number;
	deviceId: string;
	/** AES-GCM ciphertext of backup payload (base64). */
	ciphertext: string;
	updatedAt: string;
	/** SHA-256 of ciphertext for integrity checks. */
	checksum: string;
}

export interface SyncConfig {
	enabled: boolean;
	/** Provider endpoint URL when sync is implemented. */
	endpoint: string | null;
	lastSyncedAt: string | null;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
	enabled: false,
	endpoint: null,
	lastSyncedAt: null
};

/** Placeholder — sync is disabled at launch per AGENTS.md non-negotiables. */
export async function pushSyncEnvelope(envelope: SyncEnvelope): Promise<void> {
	void envelope;
	throw new Error('Cloud sync is not enabled in this build.');
}

export async function pullSyncEnvelope(): Promise<SyncEnvelope | null> {
	return null;
}
