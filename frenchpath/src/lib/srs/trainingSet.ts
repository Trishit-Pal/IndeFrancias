// Pure transform: replayable review history → the flat arrays fsrs-browser trains on.
import type { ReviewLogRecord } from '../db/schema';

export interface FsrsTrainingSet {
	ratings: Uint32Array;
	deltaTs: Uint32Array;
	lengths: Uint32Array;
}

const DAY_MS = 86_400_000;

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
		lengths.push(sorted.length);
		sorted.forEach((l, i) => {
			ratings.push(l.grade);
			deltaTs.push(i === 0 ? 0 : Math.floor((l.ts - sorted[i - 1].ts) / DAY_MS));
		});
	}

	return {
		ratings: Uint32Array.from(ratings),
		deltaTs: Uint32Array.from(deltaTs),
		lengths: Uint32Array.from(lengths)
	};
}
