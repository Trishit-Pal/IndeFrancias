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

	// Group reviews by card
	const byCard = new Map<string, ReviewLogRecord[]>();
	for (const l of valid) {
		if (!byCard.has(l.cardId)) {
			byCard.set(l.cardId, []);
		}
		byCard.get(l.cardId)!.push(l);
	}

	// Sort cards by their first review timestamp (first-seen order)
	const sorted_cards = Array.from(byCard.entries()).sort((a, b) => {
		const min_a = Math.min(...a[1].map(l => l.ts));
		const min_b = Math.min(...b[1].map(l => l.ts));
		return min_a - min_b;
	});

	const ratings: number[] = [];
	const deltaTs: number[] = [];
	const lengths: number[] = [];

	for (const [, reviews] of sorted_cards) {
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
