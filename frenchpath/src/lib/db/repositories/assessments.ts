import { getDB } from '../db';
import type { AssessmentRecord } from '../schema';

export async function getAssessment(id: string): Promise<AssessmentRecord | undefined> {
	return (await getDB()).get('assessments', id);
}

export async function listAssessments(): Promise<AssessmentRecord[]> {
	return (await getDB()).getAll('assessments');
}

export async function saveAssessment(record: AssessmentRecord): Promise<void> {
	await (await getDB()).put('assessments', record);
}

export async function hasCompletedAssessment(assessmentId: string): Promise<boolean> {
	const rec = await getAssessment(assessmentId);
	return rec !== undefined && rec.xpAwarded > 0;
}

const CHECKPOINT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Returns remaining cooldown ms, or null if retry is allowed. */
export async function getCheckpointCooldownMs(assessmentId: string): Promise<number | null> {
	const rec = await getAssessment(assessmentId);
	if (!rec?.lastFailedAt || rec.xpAwarded > 0) return null;
	const remaining = CHECKPOINT_COOLDOWN_MS - (Date.now() - rec.lastFailedAt);
	return remaining > 0 ? remaining : null;
}
