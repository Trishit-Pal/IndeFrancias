// src/lib/pwa/checksum.ts
// SHA-256 hex digest of a UTF-8 string via Web Crypto. Works in the browser
// and in Node (vitest) — both expose globalThis.crypto.subtle.
export async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
