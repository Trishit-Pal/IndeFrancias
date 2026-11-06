import { transcribe } from './asr';
import { scorePronunciation, type PronunciationScore } from './score';

const SAMPLE_RATE = 16000;

export interface Recording {
	/** Releases the mic, transcribes the take and scores it against `expected`. */
	stop(expected: string): Promise<PronunciationScore>;
	/** Releases the mic and discards the take. Safe to call repeatedly. */
	cancel(): void;
}

/**
 * Opens the mic and starts capturing. Rejects if permission is denied.
 * If `signal` aborts while the permission prompt or setup is pending, the
 * stream is released and this rejects with an AbortError (no mic leak).
 * Callers own the double-tap guard around the async gap before this resolves
 * (a second call during the pending getUserMedia would leak a second stream).
 */
export async function startRecording(signal?: AbortSignal): Promise<Recording> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const releaseTracks = () => stream.getTracks().forEach((t) => t.stop());
	const abortError = () => new DOMException('Recording aborted', 'AbortError');
	if (signal?.aborted) {
		releaseTracks();
		throw abortError();
	}
	let ctx: AudioContext;
	const chunks: Float32Array[] = [];
	try {
		ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
		const source = ctx.createMediaStreamSource(stream);
		const proc = ctx.createScriptProcessor(4096, 1, 1);
		proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
		source.connect(proc);
		proc.connect(ctx.destination);
	} catch (err) {
		releaseTracks();
		throw err;
	}
	if (signal?.aborted) {
		releaseTracks();
		await ctx.close().catch(() => undefined);
		throw abortError();
	}

	let released = false;
	async function release() {
		if (released) return;
		released = true;
		releaseTracks();
		await ctx.close().catch(() => undefined);
	}

	return {
		async stop(expected) {
			await release();
			const audio = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
			let offset = 0;
			for (const c of chunks) {
				audio.set(c, offset);
				offset += c.length;
			}
			return scorePronunciation(expected, await transcribe(audio, SAMPLE_RATE));
		},
		cancel() {
			void release();
		}
	};
}
