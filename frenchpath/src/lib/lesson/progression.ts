// Lesson unlocking: units open in sequence (by CEFR level, then order). A unit
// is available once the previous one is completed. Pure + testable.
import type { CefrLevel, LessonStatus, ProgressRecord } from '../db/schema';
import type { UnitSummary } from '../content/schema';
import { computeUnitStatesWithGates } from './gates';

export {
	computeUnitStatesWithGates,
	CHECKPOINT_GATES,
	availableGates,
	buildLockReasonMap,
	lockReasonForUnit,
	delfUnlocked,
	delfB1Unlocked,
	delfB2Unlocked,
	dalfC1Unlocked,
	assessmentIdForGate
} from './gates';

const LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export function sortUnits(summaries: readonly UnitSummary[]): UnitSummary[] {
	return [...summaries].sort((a, b) =>
		a.cefrLevel === b.cefrLevel
			? a.order - b.order
			: LEVEL_ORDER.indexOf(a.cefrLevel) - LEVEL_ORDER.indexOf(b.cefrLevel)
	);
}

/** Maps each unit id to locked / available / completed (legacy — no gates). */
export function computeUnitStates(
	summaries: readonly UnitSummary[],
	progressById: Record<string, ProgressRecord>,
	passedAssessmentIds?: Set<string>
): Map<string, LessonStatus> {
	if (passedAssessmentIds) {
		return computeUnitStatesWithGates(summaries, progressById, passedAssessmentIds);
	}
	const states = new Map<string, LessonStatus>();
	let previousCompleted = true;

	for (const unit of sortUnits(summaries)) {
		const completed = progressById[unit.id]?.status === 'completed';
		if (completed) states.set(unit.id, 'completed');
		else states.set(unit.id, previousCompleted ? 'available' : 'locked');
		previousCompleted = completed;
	}
	return states;
}

/** Convenience for guarding a single unit. */
export function isUnitLocked(
	unitId: string,
	summaries: readonly UnitSummary[],
	progressById: Record<string, ProgressRecord>,
	passedAssessmentIds?: Set<string>
): boolean {
	return computeUnitStates(summaries, progressById, passedAssessmentIds).get(unitId) === 'locked';
}
