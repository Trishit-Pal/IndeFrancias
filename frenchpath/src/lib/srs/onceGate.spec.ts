import { describe, expect, it } from 'vitest';
import { createOnceGate } from './onceGate';

describe('createOnceGate', () => {
	it('runs the first call and ignores re-entrant calls until it settles', async () => {
		const gate = createOnceGate();
		let runs = 0;
		let release!: () => void;
		const first = gate.run(
			() =>
				new Promise<void>((resolve) => {
					runs += 1;
					release = resolve;
				})
		);
		const second = gate.run(async () => {
			runs += 1;
		});
		expect(await second).toBe(false); // rejected while the first is pending
		release();
		expect(await first).toBe(true);
		expect(runs).toBe(1);
	});

	it('accepts a new call once the previous one settled, even if it threw', async () => {
		const gate = createOnceGate();
		await expect(
			gate.run(async () => {
				throw new Error('boom');
			})
		).rejects.toThrow('boom');
		expect(await gate.run(async () => {})).toBe(true);
	});
});
