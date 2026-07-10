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

	// Group reviews by card (immutably)
	const byCard = new Map<string, ReviewLogRecord[]>();
	for (const l of valid) {
		const existing = byCard.get(l.cardId);
		byCard.set(l.cardId, existing ? [...existing, l] : [l]);
	}

	// Sort cards by their first review timestamp (first-seen order)
	// Precompute min-ts to avoid recomputation in comparator
	const cardsWithMinTs = Array.from(byCard.entries()).map(([cardId, reviews]) => ({
		cardId,
		reviews,
		minTs: Math.min(...reviews.map(l => l.ts))
	}));
	const sortedCards = cardsWithMinTs.sort((a, b) => a.minTs - b.minTs);

	const ratings: number[] = [];
	const deltaTs: number[] = [];
	const lengths: number[] = [];

	for (const { reviews } of sortedCards) {
		const sorted = [...reviews].sort((a, b) => a.ts - b.ts);
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
