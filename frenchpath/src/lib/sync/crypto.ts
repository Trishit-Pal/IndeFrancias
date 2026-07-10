// Passphrase → AES-256-GCM envelope, WebCrypto only (no dependencies).
// ponytail: PBKDF2@600k, not Argon2 — adequate for a user-held file; swap to
// Argon2id (WASM) if the threat model ever includes captured-file bruteforce at scale.
import { z } from 'zod';

export const PBKDF2_ITERATIONS = 600_000;

export class WrongPassphraseError extends Error {
	constructor() {
		super('Wrong passphrase, or the file is corrupted.');
		this.name = 'WrongPassphraseError';
	}
}

export const encryptedEnvelopeSchema = z.object({
	formatVersion: z.literal(1),
	kdf: z.object({
		name: z.literal('PBKDF2'),
		hash: z.literal('SHA-256'),
		iterations: z.number().int().min(100_000),
		salt: z.string().min(1)
	}),
	iv: z.string().min(1),
	ciphertext: z.string().min(1),
	createdAt: z.string()
});
export type EncryptedEnvelope = z.infer<typeof encryptedEnvelopeSchema>;

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
	const material = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(passphrase),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encryptPayload(
	plaintext: string,
	passphrase: string
): Promise<EncryptedEnvelope> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: iv as BufferSource },
		key,
		new TextEncoder().encode(plaintext)
	);
	return {
		formatVersion: 1,
		kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: toB64(salt) },
		iv: toB64(iv),
		ciphertext: toB64(ciphertext),
		createdAt: new Date().toISOString()
	};
}

export async function decryptPayload(env: EncryptedEnvelope, passphrase: string): Promise<string> {
	const parsed = encryptedEnvelopeSchema.safeParse(env);
	if (!parsed.success) throw new Error('Not a FrenchPath sync file.');
	const key = await deriveKey(passphrase, fromB64(env.kdf.salt), env.kdf.iterations);
	try {
		const plain = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: fromB64(env.iv) as BufferSource },
			key,
			fromB64(env.ciphertext) as BufferSource
		);
		return new TextDecoder().decode(plain);
	} catch {
		throw new WrongPassphraseError();
	}
}
