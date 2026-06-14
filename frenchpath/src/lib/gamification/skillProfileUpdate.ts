import type { Unit } from '../content/schema';
import type { CefrLevel, Skill } from '../db/schema';
import { skillProfileRepo } from '../db';

const CEFR_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

function cefrMax(a: CefrLevel, b: CefrLevel): CefrLevel {
	return CEFR_ORDER.indexOf(a) >= CEFR_ORDER.indexOf(b) ? a : b;
}

/** Infer practised skills from unit cards and exercise types. */
export function skillsForUnit(unit: Unit): Skill[] {
	const skills = new Set<Skill>();
	for (const card of unit.cards) {
		for (const s of card.skills) skills.add(s);
	}
	for (const ex of unit.exercises) {
		switch (ex.type) {
			case 'dictation':
				skills.add('listening');
				break;
			case 'translation':
			case 'cloze':
			case 'reorder':
				skills.add('writing');
				break;
			case 'gender':
			case 'conjugation':
				skills.add('reading');
				break;
			default:
				skills.add('reading');
		}
	}
	if (skills.size === 0) skills.add('reading');
	return [...skills];
}

/** Bump skill estimates after a successful lesson (score ≥ 60%). Never downgrades. */
export async function updateSkillProfilesFromLesson(
	unit: Unit,
	scorePercent: number,
	now: Date = new Date()
): Promise<void> {
	if (scorePercent < 60) return;

	const skills = skillsForUnit(unit);
	for (const skill of skills) {
		const existing = await skillProfileRepo.getSkillProfile(skill);
		const estimatedLevel = cefrMax(existing?.estimatedLevel ?? 'A1', unit.cefrLevel);
		await skillProfileRepo.putSkillProfile({
			skill,
			estimatedLevel,
			updatedAt: now.getTime()
		});
	}
}
