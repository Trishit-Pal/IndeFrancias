// Selects which cards are due for review now, applying a session cap.
import { srsRepo } from '../db';
import type { SrsCard } from '../db/schema';

export const DEFAULT_REVIEW_BATCH = 20;

/** Due cards (soonest first), capped at `limit` for one review session. */
export async function getReviewQueue(
	now: Date = new Date(),
	limit: number = DEFAULT_REVIEW_BATCH
): Promise<SrsCard[]> {
	return srsRepo.getDueCards(now, limit);
}

/** How many cards are due right now (for the review badge). */
export function countDue(now: Date = new Date()): Promise<number> {
	return srsRepo.countDue(now);
}
