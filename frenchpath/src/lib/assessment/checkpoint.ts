import type { Exercise, Unit } from '$lib/content/schema';
import type { AssessmentRecord, DifficultyTier } from '$lib/db/schema';
import { assessmentsRepo } from '$lib/db';
import { addStats } from '$lib/db/repositories/stats';
import { recordDailyActivity } from '$lib/gamification/activity';
import { todayKey } from '$lib/utils/date';
import { assessmentIdForGate, type GateDefinition, CHECKPOINT_GATES } from '$lib/lesson/gates';
import {
	TIER_CONFIG,
	MILESTONE_XP_BY_TIER,
	passedCheckpoint,
	scorePercent,
	type TierConfig
} from './tiers';

export { TIER_CONFIG, MILESTONE_XP_BY_TIER, DELF_XP_BY_TIER, effectiveRetention } from './tiers';

/** Deterministic shuffle for reproducible tests when seed provided. */
export function sampleExercises(
	exercises: Exercise[],
	limit: number,
	seed = Date.now()
): Exercise[] {
	const pool = [...exercises];
	let s = seed;
	for (let i = pool.length - 1; i > 0; i--) {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		const j = s % (i + 1);
		[pool[i], pool[j]] = [pool[j]!, pool[i]!];
	}
	return pool.slice(0, Math.min(limit, pool.length));
}

export function gatePoolSeed(gateId: string): number {
	let s = 2166136261;
	for (const c of gateId) s = Math.imul(s ^ c.charCodeAt(0), 16777619);
	return s >>> 0;
}

export function buildCheckpointPool(
	units: Unit[],
	tier: DifficultyTier,
	gateId?: string
): Exercise[] {
	const all = units.flatMap((u) => u.exercises);
	const seed = gateId ? gatePoolSeed(gateId) : Date.now();
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
	if (await assessmentsRepo.hasCompletedAssessment(assessmentId)) {
		return { awarded: false, xp: 0 };
	}
	const record: AssessmentRecord = {
		assessmentId,
		kind,
		refId,
		score,
		xpAwarded: xp,
		completedAt: Date.now()
	};
	await assessmentsRepo.saveAssessment(record);
	await addStats(todayKey(), { xp });
	await recordDailyActivity();
	return { awarded: true, xp };
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
