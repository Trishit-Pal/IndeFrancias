// src/lib/pwa/checksum.spec.ts
import { describe, it, expect } from 'vitest';
import { sha256Hex } from './checksum';

describe('sha256Hex', () => {
	it('produces the known SHA-256 hex digest of a string', async () => {
		// echo -n "abc" | sha256sum
		expect(await sha256Hex('abc')).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
	});

	it('is stable for the same input and differs for different input', async () => {
		expect(await sha256Hex('hello')).toBe(await sha256Hex('hello'));
		expect(await sha256Hex('hello')).not.toBe(await sha256Hex('hello!'));
	});
});
