import type { CefrLevel, LessonStatus, ProgressRecord } from '$lib/db/schema';
import type { UnitSummary } from '$lib/content/schema';

const LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

function sortUnits(summaries: readonly UnitSummary[]): UnitSummary[] {
	return [...summaries].sort((a, b) =>
		a.cefrLevel === b.cefrLevel
			? a.order - b.order
			: LEVEL_ORDER.indexOf(a.cefrLevel) - LEVEL_ORDER.indexOf(b.cefrLevel)
	);
}

export type GateKind = 'checkpoint' | 'milestone';

export interface GateDefinition {
	id: string;
	kind: GateKind;
	/** Unit id after which this gate appears (blocks units after this until passed). */
	afterUnitId: string;
	/** Unit ids whose exercises feed the checkpoint pool. */
	unitIds: string[];
	label: string;
}

const A1_UNITS = [
	'a1-unit-01',
	'a1-unit-02',
	'a1-unit-03',
	'a1-unit-04',
	'a1-unit-05',
	'a1-unit-06',
	'a1-unit-07',
	'a1-unit-08',
	'a1-unit-09',
	'a1-unit-10'
];

const A2_UNITS = [
	'a2-unit-01',
	'a2-unit-02',
	'a2-unit-03',
	'a2-unit-04',
	'a2-unit-05',
	'a2-unit-06',
	'a2-unit-07',
	'a2-unit-08'
];

const B1_UNITS = Array.from({ length: 12 }, (_, i) => `b1-unit-${String(i + 1).padStart(2, '0')}`);
const B2_UNITS = Array.from({ length: 12 }, (_, i) => `b2-unit-${String(i + 1).padStart(2, '0')}`);
const C1_UNITS = Array.from({ length: 10 }, (_, i) => `c1-unit-${String(i + 1).padStart(2, '0')}`);

export const CHECKPOINT_GATES: GateDefinition[] = [
	{
		id: 'g1',
		kind: 'checkpoint',
		afterUnitId: 'a1-unit-03',
		unitIds: ['a1-unit-01', 'a1-unit-02', 'a1-unit-03'],
		label: 'Checkpoint 1 (A1 Units 1–3)'
	},
	{
		id: 'g2',
		kind: 'checkpoint',
		afterUnitId: 'a1-unit-06',
		unitIds: ['a1-unit-04', 'a1-unit-05', 'a1-unit-06'],
		label: 'Checkpoint 2 (A1 Units 4–6)'
	},
	{
		id: 'g3',
		kind: 'checkpoint',
		afterUnitId: 'a1-unit-09',
		unitIds: ['a1-unit-07', 'a1-unit-08', 'a1-unit-09'],
		label: 'Checkpoint 3 (A1 Units 7–9)'
	},
	{
		id: 'mA1',
		kind: 'milestone',
		afterUnitId: 'a1-unit-10',
		unitIds: [...A1_UNITS],
		label: 'A1 Milestone'
	},
	{
		id: 'g4',
		kind: 'checkpoint',
		afterUnitId: 'a2-unit-03',
		unitIds: ['a2-unit-01', 'a2-unit-02', 'a2-unit-03'],
		label: 'Checkpoint 4 (A2 Units 1–3)'
	},
	{
		id: 'g5',
		kind: 'checkpoint',
		afterUnitId: 'a2-unit-06',
		unitIds: ['a2-unit-04', 'a2-unit-05', 'a2-unit-06'],
		label: 'Checkpoint 5 (A2 Units 4–6)'
	},
	{
		id: 'g6',
		kind: 'checkpoint',
		afterUnitId: 'a2-unit-08',
		unitIds: ['a2-unit-07', 'a2-unit-08'],
		label: 'Checkpoint 6 (A2 Units 7–8)'
	},
	{
		id: 'mA2',
		kind: 'milestone',
		afterUnitId: 'a2-unit-08',
		unitIds: [...A2_UNITS],
		label: 'A2 Milestone'
	},
	{
		id: 'g7',
		kind: 'checkpoint',
		afterUnitId: 'b1-unit-03',
		unitIds: ['b1-unit-01', 'b1-unit-02', 'b1-unit-03'],
		label: 'Checkpoint 7 (B1 Units 1–3)'
	},
	{
		id: 'g8',
		kind: 'checkpoint',
		afterUnitId: 'b1-unit-06',
		unitIds: ['b1-unit-04', 'b1-unit-05', 'b1-unit-06'],
		label: 'Checkpoint 8 (B1 Units 4–6)'
	},
	{
		id: 'g9',
		kind: 'checkpoint',
		afterUnitId: 'b1-unit-09',
		unitIds: ['b1-unit-07', 'b1-unit-08', 'b1-unit-09'],
		label: 'Checkpoint 9 (B1 Units 7–9)'
	},
	{
		id: 'mB1',
		kind: 'milestone',
		afterUnitId: 'b1-unit-12',
		unitIds: [...B1_UNITS],
		label: 'B1 Milestone'
	},
	{
		id: 'g10',
		kind: 'checkpoint',
		afterUnitId: 'b2-unit-03',
		unitIds: ['b2-unit-01', 'b2-unit-02', 'b2-unit-03'],
		label: 'Checkpoint 10 (B2 Units 1–3)'
	},
	{
		id: 'g11',
		kind: 'checkpoint',
		afterUnitId: 'b2-unit-06',
		unitIds: ['b2-unit-04', 'b2-unit-05', 'b2-unit-06'],
		label: 'Checkpoint 11 (B2 Units 4–6)'
	},
	{
		id: 'g12',
		kind: 'checkpoint',
		afterUnitId: 'b2-unit-09',
		unitIds: ['b2-unit-07', 'b2-unit-08', 'b2-unit-09'],
		label: 'Checkpoint 12 (B2 Units 7–9)'
	},
	{
		id: 'mB2',
		kind: 'milestone',
		afterUnitId: 'b2-unit-12',
		unitIds: [...B2_UNITS],
		label: 'B2 Milestone'
	},
	{
		id: 'g13',
		kind: 'checkpoint',
		afterUnitId: 'c1-unit-03',
		unitIds: ['c1-unit-01', 'c1-unit-02', 'c1-unit-03'],
		label: 'Checkpoint 13 (C1 Units 1–3)'
	},
	{
		id: 'g14',
		kind: 'checkpoint',
		afterUnitId: 'c1-unit-06',
		unitIds: ['c1-unit-04', 'c1-unit-05', 'c1-unit-06'],
		label: 'Checkpoint 14 (C1 Units 4–6)'
	},
	{
		id: 'mC1',
		kind: 'milestone',
		afterUnitId: 'c1-unit-10',
		unitIds: [...C1_UNITS],
		label: 'C1 Milestone'
	}
];

export function assessmentIdForGate(gateId: string): string {
	return gateId.startsWith('m') ? `milestone:${gateId.slice(1)}` : `checkpoint:${gateId}`;
}

export function gateForAssessmentId(assessmentId: string): GateDefinition | undefined {
	if (assessmentId.startsWith('checkpoint:')) {
		const id = assessmentId.replace('checkpoint:', '');
		return CHECKPOINT_GATES.find((g) => g.id === id);
	}
	if (assessmentId.startsWith('milestone:')) {
		const id = assessmentId.replace('milestone:', '');
		return CHECKPOINT_GATES.find((g) => g.id === `m${id}`);
	}
	return undefined;
}

function unitCompleted(unitId: string, progressById: Record<string, ProgressRecord>): boolean {
	return progressById[unitId]?.status === 'completed';
}

function gatePassed(gateId: string, passedAssessmentIds: Set<string>): boolean {
	return passedAssessmentIds.has(assessmentIdForGate(gateId));
}

/** First gate blocking progression after completing `afterUnitId`, if any.
 * Multiple gates can share the same afterUnitId (e.g. checkpoint then milestone);
 * returns the first unpassed one so they are surfaced in array-order. */
export function pendingGateAfterUnit(
	unitId: string,
	passedAssessmentIds: Set<string>
): GateDefinition | undefined {
	const gates = CHECKPOINT_GATES.filter((g) => g.afterUnitId === unitId);
	if (!gates.length) return undefined;
	return gates.find((g) => !gatePassed(g.id, passedAssessmentIds));
}

/** All gates that are unlocked (prereq units done) but not yet passed. */
export function availableGates(
	progressById: Record<string, ProgressRecord>,
	passedAssessmentIds: Set<string>
): GateDefinition[] {
	return CHECKPOINT_GATES.filter((g) => {
		if (gatePassed(g.id, passedAssessmentIds)) return false;
		return g.unitIds.every((id) => unitCompleted(id, progressById));
	});
}

export function computeUnitStatesWithGates(
	summaries: readonly UnitSummary[],
	progressById: Record<string, ProgressRecord>,
	passedAssessmentIds: Set<string>
): Map<string, LessonStatus> {
	const states = new Map<string, LessonStatus>();
	const sorted = sortUnits(summaries);

	for (let i = 0; i < sorted.length; i++) {
		const unit = sorted[i]!;
		if (unitCompleted(unit.id, progressById)) {
			states.set(unit.id, 'completed');
			continue;
		}

		const prev = i > 0 ? sorted[i - 1] : null;
		if (prev && !unitCompleted(prev.id, progressById)) {
			states.set(unit.id, 'locked');
			continue;
		}

		const blockingGate = CHECKPOINT_GATES.find(
			(g) =>
				!gatePassed(g.id, passedAssessmentIds) &&
				g.unitIds.every((id) => unitCompleted(id, progressById)) &&
				sorted.findIndex((u) => u.id === g.afterUnitId) < i
		);
		if (blockingGate) {
			states.set(unit.id, 'locked');
			continue;
		}

		states.set(unit.id, 'available');
	}

	return states;
}

export function buildLockReasonMap(
	summaries: readonly UnitSummary[],
	progressById: Record<string, ProgressRecord>,
	passedAssessmentIds: Set<string>
): Map<string, string | null> {
	const map = new Map<string, string | null>();
	const sorted = sortUnits(summaries);

	for (let idx = 0; idx < sorted.length; idx++) {
		const unit = sorted[idx]!;
		if (idx <= 0) {
			map.set(unit.id, null);
			continue;
		}

		const prev = sorted[idx - 1]!;
		if (!unitCompleted(prev.id, progressById)) {
			map.set(unit.id, `Complete ${prev.title} first.`);
			continue;
		}

		const gate = CHECKPOINT_GATES.find((g) => g.afterUnitId === prev.id);
		if (gate && !gatePassed(gate.id, passedAssessmentIds)) {
			map.set(unit.id, `Pass ${gate.label} to unlock.`);
			continue;
		}

		const prevGate = CHECKPOINT_GATES.find((g) => g.afterUnitId === sorted[idx - 2]?.id);
		if (prevGate && !gatePassed(prevGate.id, passedAssessmentIds)) {
			map.set(unit.id, `Pass ${prevGate.label} to unlock.`);
			continue;
		}

		map.set(unit.id, null);
	}

	return map;
}

export function lockReasonForUnit(
	unitId: string,
	summaries: readonly UnitSummary[],
	progressById: Record<string, ProgressRecord>,
	passedAssessmentIds: Set<string>
): string | null {
	return buildLockReasonMap(summaries, progressById, passedAssessmentIds).get(unitId) ?? null;
}

export function delfUnlocked(passedAssessmentIds: Set<string>): boolean {
	return passedAssessmentIds.has('milestone:A2');
}

export function delfB1Unlocked(passedAssessmentIds: Set<string>): boolean {
	return passedAssessmentIds.has('milestone:B1');
}

export function delfB2Unlocked(passedAssessmentIds: Set<string>): boolean {
	return passedAssessmentIds.has('milestone:B2');
}

export function dalfC1Unlocked(passedAssessmentIds: Set<string>): boolean {
	return passedAssessmentIds.has('milestone:C1');
}

export function cefrLevelForUnit(unitId: string): CefrLevel {
	if (unitId.startsWith('c1')) return 'C1';
	if (unitId.startsWith('b2')) return 'B2';
	if (unitId.startsWith('b1')) return 'B1';
	if (unitId.startsWith('a2')) return 'A2';
	return 'A1';
}
