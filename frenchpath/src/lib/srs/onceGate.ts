/**
 * Re-entry guard for an async action that must not run twice while pending —
 * e.g. grading a review card, where a second tap during the IndexedDB write
 * would record the same card twice and corrupt its FSRS state.
 *
 * `run` resolves `true` when the task ran, `false` when it was ignored because
 * an earlier task is still pending. Errors propagate and release the gate.
 */
export function createOnceGate() {
	let busy = false;
	return {
		get busy() {
			return busy;
		},
		async run(task: () => Promise<void>): Promise<boolean> {
			if (busy) return false;
			busy = true;
			try {
				await task();
				return true;
			} finally {
				busy = false;
			}
		}
	};
}
