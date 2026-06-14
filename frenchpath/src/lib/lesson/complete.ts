// Persists the outcome of a finished lesson: progress, new SRS cards, stats.
import type { Unit } from '../content/schema';
import { progressRepo, srsRepo, statsRepo } from '../db';
import { createSrsCard } from '../srs/fsrs';
import { recordDailyActivity } from '../gamification/activity';
import { updateSkillProfilesFromLesson } from '../gamification/skillProfileUpdate';
import { todayKey } from '../utils/date';

export interface LessonResult {
	correct: number;
	total: number;
	score: number;
}

/** What the lesson awarded — lets the UI show an honest result. */
export interface CompleteOutcome {
	goalXp: number;
	isNewBest: boolean;
	bestScore: number;
}

const XP_PER_CORRECT = 10;

/** Namespaced SRS card id so the same content card is unique per unit. */
export function srsCardId(unitId: string, contentId: string): string {
	return `${unitId}:${contentId}`;
}

/**
 * Records a completed lesson. Goal-XP and streak credit come ONLY from genuine
 * progress — the first completion or a new personal best — so replaying an
 * already-aced lesson cannot farm the daily goal or streak. Lifetime goal-XP
 * from a lesson is therefore capped at `total * XP_PER_CORRECT`.
 */
export async function completeLesson(
	unit: Unit,
	result: LessonResult,
	opts: { now?: Date } = {}
): Promise<CompleteOutcome> {
	const now = opts.now ?? new Date();
	const existing = await progressRepo.getProgress(unit.id);

	// Legacy records (pre-bestCorrect) fall back to a value derived from best score.
	const previousBest =
		existing?.bestCorrect ?? Math.round(((existing?.score ?? 0) / 100) * result.total);
	const newBest = Math.max(previousBest, result.correct);
	const goalXp = Math.max(0, result.correct - previousBest) * XP_PER_CORRECT;
	const bestScore = Math.max(result.score, existing?.score ?? 0);

	await progressRepo.putProgress({
		lessonId: unit.id,
		status: 'completed',
		score: bestScore,
		bestCorrect: newBest,
		attempts: (existing?.attempts ?? 0) + 1,
		lastVisited: now.getTime(),
		cefrLevel: unit.cefrLevel
	});

	const newCards = [];
	for (const card of unit.cards) {
		const cardId = srsCardId(unit.id, card.id);
		if (!(await srsRepo.hasCard(cardId))) {
			newCards.push(
				createSrsCard({
					cardId,
					contentId: card.id,
					cefrLevel: card.cefrLevel,
					skill: card.skills[0] ?? 'reading',
					now
				})
			);
		}
	}
	if (newCards.length > 0) await srsRepo.putCards(newCards);

	if (goalXp > 0) {
		await statsRepo.addStats(todayKey(now), { xp: goalXp, lessonsCompleted: 1 });
		await recordDailyActivity(now);
	} else {
		await statsRepo.addStats(todayKey(now), { lessonsCompleted: 1 });
	}

	await updateSkillProfilesFromLesson(unit, bestScore, now);

	return { goalXp, isNewBest: result.correct > previousBest, bestScore };
}
