import { describe, it, expect, vi, beforeEach } from 'vitest';

const createModel = vi.fn();
const getModelUrl = vi.fn();

vi.mock('vosk-browser', () => ({ createModel: (url: string) => createModel(url) }));
vi.mock('./modelSource', () => ({ getModelUrl: () => getModelUrl() }));

// The model promise is module-level state, so each test imports a fresh copy of the module.
async function loadAsr() {
	vi.resetModules();
	return import('./asr');
}

describe('speech model loading', () => {
	beforeEach(() => {
		createModel.mockReset();
		getModelUrl.mockReset();
	});

	it('retries the load after a failure instead of remembering it', async () => {
		const { preloadAsr } = await loadAsr();
		getModelUrl.mockRejectedValueOnce(new Error('Speaking pack not downloaded yet.'));
		await expect(preloadAsr()).rejects.toThrow('Speaking pack not downloaded yet.');
		expect(createModel).not.toHaveBeenCalled();

		getModelUrl.mockResolvedValueOnce('blob:model');
		createModel.mockResolvedValueOnce({ id: 'model' });
		await expect(preloadAsr()).resolves.toBeUndefined();
		expect(createModel).toHaveBeenCalledTimes(1);
		expect(createModel).toHaveBeenCalledWith('blob:model');
	});

	it('retries after the model itself fails to start', async () => {
		const { preloadAsr } = await loadAsr();
		getModelUrl.mockResolvedValue('blob:model');
		createModel.mockRejectedValueOnce(new Error('worker error'));
		await expect(preloadAsr()).rejects.toThrow('worker error');

		createModel.mockResolvedValueOnce({ id: 'model' });
		await expect(preloadAsr()).resolves.toBeUndefined();
		expect(createModel).toHaveBeenCalledTimes(2);
	});

	it('creates the model once for repeated successful loads', async () => {
		const { preloadAsr } = await loadAsr();
		getModelUrl.mockResolvedValue('blob:model');
		createModel.mockResolvedValue({ id: 'model' });
		await preloadAsr();
		await preloadAsr();
		expect(createModel).toHaveBeenCalledTimes(1);
		expect(getModelUrl).toHaveBeenCalledTimes(1);
	});
});
