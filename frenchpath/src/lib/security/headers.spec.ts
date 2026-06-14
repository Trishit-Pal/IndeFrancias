import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');

const REQUIRED_HEADERS = [
	'X-Content-Type-Options',
	'Referrer-Policy',
	'Permissions-Policy',
	'Cross-Origin-Opener-Policy',
	'Cross-Origin-Resource-Policy',
	'Strict-Transport-Security'
] as const;

function parseVercelHeaders(): Map<string, string> {
	const raw = readFileSync(resolve(ROOT, 'vercel.json'), 'utf8');
	const config = JSON.parse(raw) as {
		headers?: { source: string; headers: { key: string; value: string }[] }[];
	};
	const entry = config.headers?.find((h) => h.source === '/(.*)');
	const map = new Map<string, string>();
	for (const h of entry?.headers ?? []) {
		map.set(h.key, h.value);
	}
	return map;
}

function parseNetlifyHeaders(): Map<string, string> {
	const raw = readFileSync(resolve(ROOT, 'static/_headers'), 'utf8');
	const map = new Map<string, string>();
	for (const line of raw.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('#')) continue;
		const idx = trimmed.indexOf(':');
		if (idx === -1) continue;
		const key = trimmed.slice(0, idx).trim();
		const value = trimmed.slice(idx + 1).trim();
		map.set(key, value);
	}
	return map;
}

function assertSecurityHeaders(map: Map<string, string>, label: string): void {
	for (const key of REQUIRED_HEADERS) {
		expect(map.has(key), `${label} missing ${key}`).toBe(true);
	}
	expect(map.get('X-Content-Type-Options')).toBe('nosniff');
	expect(map.get('Permissions-Policy')).toMatch(/microphone=\(self\)/);
	expect(map.get('Strict-Transport-Security')).toMatch(/max-age=/);
}

describe('security headers', () => {
	it('vercel.json defines required headers on all routes', () => {
		assertSecurityHeaders(parseVercelHeaders(), 'vercel.json');
	});

	it('static/_headers defines the same required headers', () => {
		assertSecurityHeaders(parseNetlifyHeaders(), 'static/_headers');
	});
});
