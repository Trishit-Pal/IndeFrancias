// Thin service over vosk-browser (which runs its own Web Worker internally).
// One model instance per session, lazily created and memoized.
import { getModelUrl } from './modelSource';
import type { VoskWord } from './score';
import type { Model, KaldiRecognizer } from 'vosk-browser';

let modelPromise: Promise<Model> | null = null;

const E2E_STUB_KEY = 'fp-e2e-stub-asr';

async function getModel(): Promise<Model> {
	if (!modelPromise) {
		modelPromise = (async () => {
			const { createModel } = await import('vosk-browser');
			return createModel(await getModelUrl());
		})();
	}
	return modelPromise;
}

/** Warm the model while the learner reads the prompt. */
export async function preloadAsr(): Promise<void> {
	if (typeof localStorage !== 'undefined' && localStorage.getItem(E2E_STUB_KEY)) return;
	await getModel();
}

/** Transcribes one recorded utterance to word-level results. */
export async function transcribe(audio: Float32Array, sampleRate: number): Promise<VoskWord[]> {
	if (typeof localStorage !== 'undefined') {
		const stub = localStorage.getItem(E2E_STUB_KEY);
		if (stub) return JSON.parse(stub) as VoskWord[];
	}
	const model = await getModel();
	const rec: KaldiRecognizer = new model.KaldiRecognizer(sampleRate);
	rec.setWords(true);
	return new Promise<VoskWord[]>((resolve, reject) => {
		const cleanup = () => rec.remove();
		const onMessage = (message: Parameters<Parameters<KaldiRecognizer['on']>[1]>[0]) => {
			if (message.event === 'result') {
				cleanup();
				resolve(message.result.result ?? []);
			} else if (message.event === 'error') {
				cleanup();
				reject(new Error(message.error));
			}
		};
		rec.on('result', onMessage);
		rec.on('error', onMessage);
		try {
			// Raw Float32Array + sample rate — no need to fake an AudioBuffer.
			rec.acceptWaveformFloat(audio, sampleRate);
			rec.retrieveFinalResult();
		} catch (err) {
			cleanup();
			reject(err instanceof Error ? err : new Error('transcription failed'));
		}
	});
}
