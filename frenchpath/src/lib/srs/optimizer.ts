/** Minimum review-log rows before FSRS weight optimization runs. */
export const FSRS_OPTIMIZER_MIN_REVIEWS = 500;

export interface FsrsOptimizerResult {
	/** Custom FSRS weights (21 parameters) or null when insufficient data. */
	weights: number[] | null;
	reviewCount: number;
	optimizedAt: number | null;
}

/** Placeholder optimizer — returns null until review log threshold is met. */
export function computeFsrsWeights(reviewCount: number): FsrsOptimizerResult {
	if (reviewCount < FSRS_OPTIMIZER_MIN_REVIEWS) {
		return { weights: null, reviewCount, optimizedAt: null };
	}
	// V1 post-launch: port open-spaced-repetition optimizer in a Web Worker.
	return { weights: null, reviewCount, optimizedAt: null };
}

/** Schedule optimizer when enough reviews exist; no-op in launch build. */
export async function maybeRunFsrsOptimizer(
	reviewCount: number,
	onResult: (result: FsrsOptimizerResult) => void | Promise<void>
): Promise<void> {
	const result = computeFsrsWeights(reviewCount);
	if (result.weights) await onResult(result);
}
