import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startRecording } from './recordAndScore';

vi.mock('./asr', () => ({ transcribe: vi.fn(async () => []) }));

function setup(opts: { ctxThrows?: boolean } = {}) {
	const stop = vi.fn();
	const stream = { getTracks: () => [{ stop }, { stop }] };
	const getUserMedia = vi.fn(async () => stream);
	const close = vi.fn(async () => undefined);
	vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
	vi.stubGlobal(
		'AudioContext',
		class {
			destination = {};
			constructor() {
				if (opts.ctxThrows) throw new Error('ctx failed');
			}
			createMediaStreamSource() {
				return { connect: () => undefined };
			}
			createScriptProcessor() {
				return { connect: () => undefined };
			}
			close = close;
		}
	);
	return { stop, close, getUserMedia };
}

describe('startRecording', () => {
	beforeEach(() => vi.unstubAllGlobals());
	afterEach(() => vi.unstubAllGlobals());

	it('stops tracks and rejects with AbortError when aborted before getUserMedia resolves', async () => {
		const { stop } = setup();
		const ctrl = new AbortController();
		const p = startRecording(ctrl.signal);
		ctrl.abort();
		await expect(p).rejects.toMatchObject({ name: 'AbortError' });
		expect(stop).toHaveBeenCalledTimes(2);
	});

	it('cancel() is idempotent and stops tracks', async () => {
		const { stop, close } = setup();
		const rec = await startRecording();
		rec.cancel();
		rec.cancel();
		await Promise.resolve();
		expect(stop).toHaveBeenCalledTimes(2);
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('releases tracks when AudioContext setup throws', async () => {
		const { stop } = setup({ ctxThrows: true });
		await expect(startRecording()).rejects.toThrow('ctx failed');
		expect(stop).toHaveBeenCalledTimes(2);
	});
});
