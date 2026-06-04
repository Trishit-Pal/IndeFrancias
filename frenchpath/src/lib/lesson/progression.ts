// Lesson unlocking: units open in sequence (by CEFR level, then order). A unit
// is available once the previous one is completed. Pure + testable.
import type { CefrLevel, LessonStatus, ProgressRecord } from '../db/schema';
import type { UnitSummary } from '../content/schema';

const LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export function sortUnits(summaries: readonly UnitSummary[]): UnitSummary[] {
	return [...summaries].sort((a, b) =>
		a.cefrLevel === b.cefrLevel
			? a.order - b.order
			: LEVEL_ORDER.indexOf(a.cefrLevel) - LEVEL_ORDER.indexOf(b.cefrLevel)
	);
}

/** Maps each unit id to locked / available / completed. */
export function computeUnitStates(
	summaries: readonly UnitSummary[],
	progressById: Record<string, ProgressRecord>
): Map<string, LessonStatus> {
	const states = new Map<string, LessonStatus>();
	let previousCompleted = true; // the first unit is always available

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
	progressById: Record<string, ProgressRecord>
): boolean {
	return computeUnitStates(summaries, progressById).get(unitId) === 'locked';
}
