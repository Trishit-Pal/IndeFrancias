import type { Exercise, Unit } from '$lib/content/schema';
import type { AssessmentRecord, DifficultyTier } from '$lib/db/schema';
import { assessmentsRepo, writeAtomically } from '$lib/db';
import { addStatsInTx } from '$lib/db/repositories/stats';
import { recordDailyActivityInTx } from '$lib/gamification/activity';
import { todayKey } from '$lib/utils/date';
import { shuffle } from '$lib/utils/seededShuffle';
import { assessmentIdForGate, type GateDefinition, CHECKPOINT_GATES } from '$lib/lesson/gates';
import {
	TIER_CONFIG,
	MILESTONE_XP_BY_TIER,
	passedCheckpoint,
	scorePercent,
	type TierConfig
} from './tiers';

export { TIER_CONFIG, MILESTONE_XP_BY_TIER, DELF_XP_BY_TIER, effectiveRetention } from './tiers';

/** Deterministic for a given seed; a random draw when no seed is given. */
export function sampleExercises(
	exercises: Exercise[],
	limit: number,
	seed: string = String(Date.now())
): Exercise[] {
	return shuffle(exercises, seed).slice(0, Math.min(limit, exercises.length));
}

/**
 * `attemptKey` identifies the attempt (the stored `lastFailedAt`, or 0 for a first attempt): it
 * stays the same through a reload, and changes after a failed attempt so a retry sees new questions.
 */
export function buildCheckpointPool(
	units: Unit[],
	tier: DifficultyTier,
	gateId?: string,
	attemptKey = 0
): Exercise[] {
	const all = units.flatMap((u) => u.exercises);
	const seed = gateId ? `${gateId}:${attemptKey}` : undefined;
	return sampleExercises(all, TIER_CONFIG[tier].questionCount, seed);
}

export function gateById(gateId: string): GateDefinition | undefined {
	return CHECKPOINT_GATES.find((g) => g.id === gateId);
}

export function tierConfig(tier: DifficultyTier): TierConfig {
	return TIER_CONFIG[tier];
}

export function xpForGate(gate: GateDefinition, tier: DifficultyTier): number {
	return gate.kind === 'milestone' ? MILESTONE_XP_BY_TIER[tier] : TIER_CONFIG[tier].xp;
}

export function scoreCheckpoint(
	correct: number,
	total: number,
	tier: DifficultyTier
): {
	percent: number;
	passed: boolean;
} {
	const percent = scorePercent(correct, total);
	return { percent, passed: passedCheckpoint(correct, total, tier) };
}

export async function awardAssessmentXp(
	assessmentId: string,
	kind: AssessmentRecord['kind'],
	refId: string,
	score: number,
	xp: number
): Promise<{ awarded: boolean; xp: number }> {
	const now = new Date();
	const day = todayKey(now);
	const record: AssessmentRecord = {
		assessmentId,
		kind,
		refId,
		score,
		xpAwarded: xp,
		completedAt: now.getTime()
	};
	// Check-then-write in one readwrite transaction: IndexedDB serialises
	// overlapping ones, so a double submit cannot award the XP twice.
	return writeAtomically(['assessments', 'stats', 'streak'], async (tx) => {
		const assessments = tx.objectStore('assessments');
		const existing = await assessments.get(assessmentId);
		if (existing && existing.xpAwarded > 0) return { awarded: false, xp: 0 };
		await assessments.put(record);
		await addStatsInTx(tx.objectStore('stats'), day, { xp });
		await recordDailyActivityInTx(tx.objectStore('streak'), day);
		return { awarded: true, xp };
	});
}

export async function completeGateAssessment(
	gate: GateDefinition,
	tier: DifficultyTier,
	correct: number,
	total: number
): Promise<{ passed: boolean; percent: number; xpAwarded: number }> {
	const { percent, passed } = scoreCheckpoint(correct, total, tier);
	const assessmentId = assessmentIdForGate(gate.id);
	const kind: AssessmentRecord['kind'] =
		gate.kind === 'milestone' ? 'cefr_milestone' : 'unit_checkpoint';

	if (!passed) {
		const existing = await assessmentsRepo.getAssessment(assessmentId);
		if (existing?.xpAwarded && existing.xpAwarded > 0) {
			return { passed: false, percent, xpAwarded: 0 };
		}
		await assessmentsRepo.saveAssessment({
			assessmentId,
			kind,
			refId: gate.id,
			score: percent,
			xpAwarded: 0,
			completedAt: Date.now(),
			lastFailedAt: Date.now()
		});
		return { passed: false, percent, xpAwarded: 0 };
	}

	const result = await awardAssessmentXp(
		assessmentId,
		kind,
		gate.id,
		percent,
		xpForGate(gate, tier)
	);
	return { passed: true, percent, xpAwarded: result.xp };
}

export async function passedAssessmentIds(): Promise<Set<string>> {
	const all = await assessmentsRepo.listAssessments();
	return new Set(all.filter((a) => a.xpAwarded > 0).map((a) => a.assessmentId));
}
