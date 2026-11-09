// Persists the outcome of a finished lesson — progress, new SRS cards, stats,
// streak and skill profiles — in ONE transaction, so a failure part-way can never
// commit the new best score without the XP it earned.
import type { Unit } from '../content/schema';
import { writeAtomically, type SrsCard, type WritableStore } from '../db';
import { addStatsInTx } from '../db/repositories/stats';
import { createSrsCard } from '../srs/fsrs';
import { recordDailyActivityInTx } from '../gamification/activity';
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
	const day = todayKey(now);
	// Built before the transaction opens: only IDB requests may be awaited inside it.
	const candidates = unit.cards.map((card) =>
		createSrsCard({
			cardId: srsCardId(unit.id, card.id),
			contentId: card.id,
			cefrLevel: card.cefrLevel,
			skill: card.skills[0] ?? 'reading',
			now
		})
	);

	return writeAtomically(
		['progress', 'srsCards', 'stats', 'streak', 'skillProfile'],
		async (tx) => {
			const progress = tx.objectStore('progress');
			const existing = await progress.get(unit.id);

			// Legacy records (pre-bestCorrect) fall back to a value derived from best score.
			const previousBest =
				existing?.bestCorrect ?? Math.round(((existing?.score ?? 0) / 100) * result.total);
			const newBest = Math.max(previousBest, result.correct);
			const goalXp = Math.max(0, result.correct - previousBest) * XP_PER_CORRECT;
			const bestScore = Math.max(result.score, existing?.score ?? 0);

			await progress.put({
				lessonId: unit.id,
				status: 'completed',
				score: bestScore,
				bestCorrect: newBest,
				attempts: (existing?.attempts ?? 0) + 1,
				lastVisited: now.getTime(),
				cefrLevel: unit.cefrLevel
			});
			await seedNewCards(tx.objectStore('srsCards'), candidates);

			const stats = tx.objectStore('stats');
			if (goalXp > 0) {
				await addStatsInTx(stats, day, { xp: goalXp, lessonsCompleted: 1 });
				await recordDailyActivityInTx(tx.objectStore('streak'), day);
			} else {
				await addStatsInTx(stats, day, { lessonsCompleted: 1 });
			}

			await updateSkillProfilesFromLesson(tx.objectStore('skillProfile'), unit, bestScore, now);

			return { goalXp, isNewBest: result.correct > previousBest, bestScore };
		}
	);
}

/** Writes the cards not already scheduled; existing cards keep their FSRS state. */
async function seedNewCards(store: WritableStore<'srsCards'>, cards: SrsCard[]): Promise<void> {
	const keys = await Promise.all(cards.map((card) => store.getKey(card.cardId)));
	await Promise.all(cards.filter((_, i) => keys[i] === undefined).map((card) => store.put(card)));
}
