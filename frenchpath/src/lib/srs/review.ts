// Records one review: reschedules the card (FSRS), persists it, appends the
// review log, and credits daily stats — all in ONE transaction, so a crash or
// tab kill mid-way leaves the card, log, stats and streak all-or-nothing.
import { writeAtomically } from '../db';
import type { ReviewLogRecord, SrsCard } from '../db/schema';
import { addStatsInTx } from '../db/repositories/stats';
import { gradeCard, type ReviewGrade } from './fsrs';
import { recordDailyActivityInTx } from '../gamification/activity';
import { todayKey } from '../utils/date';

const XP_PER_REVIEW = 5;

export interface RecordReviewOptions {
	now?: Date;
	targetRetention?: number;
	durationMs?: number;
	weights?: number[] | null;
}

/** `${unitId}:${contentId}` -> its parts (used to resolve display content). */
export function parseCardId(cardId: string): { unitId: string; contentId: string } {
	const idx = cardId.indexOf(':');
	return idx === -1
		? { unitId: '', contentId: cardId }
		: { unitId: cardId.slice(0, idx), contentId: cardId.slice(idx + 1) };
}

export async function recordReview(
	card: SrsCard,
	grade: ReviewGrade,
	opts: RecordReviewOptions = {}
): Promise<SrsCard> {
	const now = opts.now ?? new Date();
	const { card: updated, log } = gradeCard(card, grade, {
		now,
		targetRetention: opts.targetRetention,
		weights: opts.weights
	});

	const day = todayKey(now);
	const entry: ReviewLogRecord = {
		cardId: card.cardId,
		ts: now.getTime(),
		grade: log.rating,
		state: log.state,
		stability: log.stability,
		difficulty: log.difficulty,
		elapsedDays: log.elapsed_days,
		scheduledDays: log.scheduled_days,
		reviewDurationMs: opts.durationMs
	};

	await writeAtomically(['srsCards', 'reviewLog', 'stats', 'streak'], async (tx) => {
		await tx.objectStore('srsCards').put(updated);
		await tx.objectStore('reviewLog').add(entry);
		await addStatsInTx(tx.objectStore('stats'), day, { reviewsDone: 1, xp: XP_PER_REVIEW });
		await recordDailyActivityInTx(tx.objectStore('streak'), day);
	});

	return updated;
}
