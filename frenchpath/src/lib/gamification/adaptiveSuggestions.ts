import type { UnitSummary } from '$lib/content/schema';
import type { Skill, SkillProfileRecord } from '$lib/db/schema';
import type { LessonStatus } from '$lib/db/schema';
import { cefrIndex, weakestSkill } from './todayPlan';

/** Recommend a unit targeting the learner's weakest estimated skill. */
export function suggestUnitForWeakSkill(
	units: readonly UnitSummary[],
	skillProfiles: readonly SkillProfileRecord[],
	states: Map<string, LessonStatus>
): { unit: UnitSummary; skill: Skill; reason: string } | null {
	const weakestName = weakestSkill(skillProfiles);
	const weakest = skillProfiles.find((p) => p.skill === weakestName);
	if (!weakest) return null;

	// Locked units can't be started and completed ones are done: neither is a suggestion.
	const available = units.filter((u) => {
		const status = states.get(u.id) ?? 'locked';
		return status !== 'locked' && status !== 'completed';
	});
	// Objectives are matched lower-case; both spoken skills share the "speaking" keyword.
	const keyword = weakest.skill.startsWith('spoken') ? 'speaking' : weakest.skill;
	const candidates = available.filter((u) => u.objective.toLowerCase().includes(keyword));

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
