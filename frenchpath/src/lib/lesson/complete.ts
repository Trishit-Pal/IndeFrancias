// Persists the outcome of a finished lesson: progress, new SRS cards, stats.
import type { Unit } from '../content/schema';
import { progressRepo, srsRepo, statsRepo } from '../db';
import { createSrsCard } from '../srs/fsrs';
import { recordDailyActivity } from '../gamification/activity';
import { todayKey } from '../utils/date';

export interface LessonResult {
	correct: number;
	total: number;
	score: number;
}

const XP_PER_CORRECT = 10;

/** Namespaced SRS card id so the same content card is unique per unit. */
export function srsCardId(unitId: string, contentId: string): string {
	return `${unitId}:${contentId}`;
}

/**
 * Records a completed lesson:
 *  1. upserts progress (keeping the best score, bumping attempts),
 *  2. seeds SRS cards for this unit's vocab not already scheduled,
 *  3. adds XP + a lesson to today's stats.
 */
export async function completeLesson(unit: Unit, result: LessonResult): Promise<void> {
	const existing = await progressRepo.getProgress(unit.id);
	await progressRepo.putProgress({
		lessonId: unit.id,
		status: 'completed',
		score: Math.max(result.score, existing?.score ?? 0),
		attempts: (existing?.attempts ?? 0) + 1,
		lastVisited: Date.now(),
		cefrLevel: unit.cefrLevel
	});

	const now = new Date();
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

	await statsRepo.addStats(todayKey(now), {
		xp: result.correct * XP_PER_CORRECT,
		lessonsCompleted: 1
	});

	await recordDailyActivity(now);
}
