import { describe, it, expect } from 'vitest';
import { encryptPayload, decryptPayload, WrongPassphraseError, PBKDF2_ITERATIONS } from './crypto';

describe('sync crypto', () => {
	it('round-trips under the right passphrase', async () => {
		const env = await encryptPayload('{"hello":"monde"}', 'correct horse');
		expect(env.formatVersion).toBe(1);
		expect(env.kdf.iterations).toBe(PBKDF2_ITERATIONS);
		expect(await decryptPayload(env, 'correct horse')).toBe('{"hello":"monde"}');
	});

	it('wrong passphrase throws WrongPassphraseError', async () => {
		const env = await encryptPayload('secret', 'right');
		await expect(decryptPayload(env, 'wrong')).rejects.toBeInstanceOf(WrongPassphraseError);
	});

	it('tampered ciphertext throws WrongPassphraseError (GCM auth)', async () => {
		const env = await encryptPayload('secret', 'pw');
		const bytes = Uint8Array.from(atob(env.ciphertext), (c) => c.charCodeAt(0));
		bytes[0] ^= 0xff;
		const tampered = { ...env, ciphertext: btoa(String.fromCharCode(...bytes)) };
		await expect(decryptPayload(tampered, 'pw')).rejects.toBeInstanceOf(WrongPassphraseError);
	});

	it('unique salt and iv per encryption', async () => {
		const a = await encryptPayload('x', 'pw');
		const b = await encryptPayload('x', 'pw');
		expect(a.kdf.salt).not.toBe(b.kdf.salt);
		expect(a.iv).not.toBe(b.iv);
		expect(a.ciphertext).not.toBe(b.ciphertext);
	});
});
