// Pure transform: replayable review history → the flat arrays fsrs-browser trains on.
// fsrs-rs learns from items whose LAST review is the label and the reviews before it the
// history, so each card contributes one item per prefix of its history (lengths 2..L),
// the same expansion Anki uses. `lengths` holds each item's length.
import type { ReviewLogRecord } from '../db/schema';

export interface FsrsTrainingSet {
	ratings: Uint32Array;
	deltaTs: Uint32Array;
	lengths: Uint32Array;
}

const DAY_MS = 86_400_000;

/**
 * Only a card's first reviews feed training. ponytail: a card's prefixes cost L(L+1)/2
 * entries, so one card reviewed 100k times would need ~5e9; capping L keeps the set at
 * most ~33 entries per log. A card past 64 reviews is a leech whose later history adds
 * little; raise this if real histories run longer.
 */
export const MAX_REVIEWS_PER_CARD = 64;

export function buildTrainingSet(logs: ReviewLogRecord[]): FsrsTrainingSet {
	const valid = logs.filter((l) => l.grade >= 1 && l.grade <= 4);

	// Group reviews by card. ponytail: these arrays are local to this call, so pushing and
	// sorting them in place is safe; copying on every append was O(k²) per card.
	const byCard = new Map<string, ReviewLogRecord[]>();
	for (const l of valid) {
		const reviews = byCard.get(l.cardId);
		if (reviews) reviews.push(l);
		else byCard.set(l.cardId, [l]);
	}

	// Each card's reviews oldest-first; cards in order of their first review (stable sorts, so
	// ties keep input order).
	const sortedCards = Array.from(byCard.values(), (reviews) =>
		reviews.sort((a, b) => a.ts - b.ts)
	).sort((a, b) => a[0].ts - b[0].ts);

	const ratings: number[] = [];
	const deltaTs: number[] = [];
	const lengths: number[] = [];

	for (const sorted of sortedCards) {
		const history = sorted.slice(0, MAX_REVIEWS_PER_CARD);
		const days = history.map((l, i) =>
			i === 0 ? 0 : Math.floor((l.ts - history[i - 1].ts) / DAY_MS)
		);
		// A single review has nothing after it to learn from, so it yields no item.
		for (let len = 2; len <= history.length; len++) {
			lengths.push(len);
			for (let i = 0; i < len; i++) {
				ratings.push(history[i].grade);
				deltaTs.push(days[i]);
			}
		}
	}

	return {
		ratings: Uint32Array.from(ratings),
		deltaTs: Uint32Array.from(deltaTs),
		lengths: Uint32Array.from(lengths)
	};
}
