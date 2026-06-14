import type { UnitSummary } from '$lib/content/schema';
import type { Skill, SkillProfileRecord } from '$lib/db/schema';
import type { LessonStatus } from '$lib/db/schema';

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

function cefrIndex(level: string): number {
	const idx = CEFR_ORDER.indexOf(level as (typeof CEFR_ORDER)[number]);
	return idx === -1 ? 0 : idx;
}

/** Recommend a unit targeting the learner's weakest estimated skill. */
export function suggestUnitForWeakSkill(
	units: readonly UnitSummary[],
	skillProfiles: readonly SkillProfileRecord[],
	states: Map<string, LessonStatus>
): { unit: UnitSummary; skill: Skill; reason: string } | null {
	if (skillProfiles.length === 0) return null;

	const weakest = [...skillProfiles].sort(
		(a, b) => cefrIndex(a.estimatedLevel) - cefrIndex(b.estimatedLevel)
	)[0];
	if (!weakest) return null;

	const available = units.filter((u) => (states.get(u.id) ?? 'locked') !== 'locked');
	const candidates = available.filter((u) =>
		u.objective.toLowerCase().includes(weakest.skill.replace('spoken', 'speaking'))
	);

	const pool =
		candidates.length > 0
			? candidates
			: available.filter((u) => cefrIndex(u.cefrLevel) <= cefrIndex(weakest.estimatedLevel));

	const unit = (pool.length > 0 ? pool : available)[0];
	if (!unit) return null;

	return {
		unit,
		skill: weakest.skill,
		reason: `Your ${weakest.skill.replace(/([A-Z])/g, ' $1').trim()} is at ${weakest.estimatedLevel} — try « ${unit.title} » next.`
	};
}
