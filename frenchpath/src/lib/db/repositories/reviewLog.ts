import { getDB } from '../db';
import type { ReviewLogRecord } from '../schema';

/** Appends a review entry; returns its generated id. */
export async function appendReviewLog(entry: ReviewLogRecord): Promise<number> {
	return (await getDB()).add('reviewLog', entry);
}

export async function getLogsForCard(cardId: string): Promise<ReviewLogRecord[]> {
	return (await getDB()).getAllFromIndex('reviewLog', 'cardId', cardId);
}

/** Total reviews logged — FSRS optimisation becomes worthwhile past ~1,000. */
export async function countReviews(): Promise<number> {
	return (await getDB()).count('reviewLog');
}
