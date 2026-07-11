// Dedicated worker: trains FSRS weights from the learner's own review history.
// WASM + data all local — nothing leaves the device (SPEC invariants 1/2).
import init, { Fsrs } from 'fsrs-browser';

export interface OptimizerRequest {
	ratings: Uint32Array;
	deltaTs: Uint32Array;
	lengths: Uint32Array;
}
export type OptimizerResponse = { ok: true; weights: number[] } | { ok: false; error: string };

self.onmessage = async (e: MessageEvent<OptimizerRequest>) => {
	try {
		await init();
		const fsrs = new Fsrs();
		// Real fsrs-browser 6.x signature: computeParameters(ratings, delta_ts, lengths,
		// progress, enable_short_term, card_ids?, num_relearning_steps?, training_config?).
		// progress: null (no progress callback needed). enable_short_term: true, matching
		// this app's scheduler default (ts-fsrs generatorParameters() defaults to true).
		const weights = fsrs.computeParameters(
			e.data.ratings,
			e.data.deltaTs,
			e.data.lengths,
			null,
			true
		);
		const out: OptimizerResponse = { ok: true, weights: Array.from(weights) };
		self.postMessage(out);
	} catch (err) {
		const out: OptimizerResponse = {
			ok: false,
			error: err instanceof Error ? err.message : 'optimizer failed'
		};
		self.postMessage(out);
	}
};
