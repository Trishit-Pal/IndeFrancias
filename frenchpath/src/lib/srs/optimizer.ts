// On-device FSRS weight optimization (WP2). Decision logic is pure and
// unit-tested; the WASM training runs in optimizer.worker.ts.
import { generatorParameters } from 'ts-fsrs';
import * as settingsRepo from '../db/repositories/settings';
import * as reviewLogRepo from '../db/repositories/reviewLog';
import { buildTrainingSet } from './trainingSet';
import type { OptimizerResponse } from './optimizer.worker';

export const FSRS_OPTIMIZER_MIN_REVIEWS = 500;
export const FSRS_OPTIMIZER_INTERVAL_MS = 7 * 86_400_000;

export interface FsrsOptimizerResult {
	weights: number[] | null;
	reviewCount: number;
	optimizedAt: number | null;
}

export function shouldRunOptimizer(
	reviewCount: number,
	lastOptimizedAt: number | null,
	now: number
): boolean {
	if (reviewCount < FSRS_OPTIMIZER_MIN_REVIEWS) return false;
	if (lastOptimizedAt === null) return true;
	return now - lastOptimizedAt > FSRS_OPTIMIZER_INTERVAL_MS;
}

/** Trains in a worker; resolves with tuned weights. Throws on worker failure. */
export async function runFsrsOptimizer(): Promise<FsrsOptimizerResult> {
	const logs = await reviewLogRepo.getAllReviewLogs();
	if (logs.length < FSRS_OPTIMIZER_MIN_REVIEWS) {
		return { weights: null, reviewCount: logs.length, optimizedAt: null };
	}
	const set = buildTrainingSet(logs);
	const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), {
		type: 'module'
	});
	try {
		const res = await new Promise<OptimizerResponse>((resolve, reject) => {
			worker.onmessage = (e: MessageEvent<OptimizerResponse>) => resolve(e.data);
			worker.onerror = (e) => reject(new Error(e.message));
			worker.postMessage(set, [set.ratings.buffer, set.deltaTs.buffer, set.lengths.buffer]);
		});
		if (!res.ok) throw new Error(res.error);
		// Only accept a weight vector ts-fsrs understands (FSRS-6: 21 params).
		const expected = generatorParameters().w.length;
		if (res.weights.length !== expected) {
			throw new Error(`optimizer returned ${res.weights.length} weights, expected ${expected}`);
		}
		return { weights: res.weights, reviewCount: logs.length, optimizedAt: Date.now() };
	} finally {
		worker.terminate();
	}
}

/** Runs the optimizer when due and persists tuned weights to settings. */
export async function maybeRunFsrsOptimizer(
	onResult?: (result: FsrsOptimizerResult) => void | Promise<void>
): Promise<void> {
	const settings = await settingsRepo.getSettings();
	const reviewCount = await reviewLogRepo.countReviews();
	if (!shouldRunOptimizer(reviewCount, settings.fsrsOptimizedAt, Date.now())) return;
	try {
		const result = await runFsrsOptimizer();
		if (!result.weights) return;
		await settingsRepo.saveSettings({
			fsrsWeights: result.weights,
			fsrsOptimizedAt: result.optimizedAt,
			fsrsOptimizedReviewCount: result.reviewCount
		});
		if (onResult) await onResult(result);
	} catch {
		// Optimizer failure must never disturb the learner; defaults keep working.
	}
}
