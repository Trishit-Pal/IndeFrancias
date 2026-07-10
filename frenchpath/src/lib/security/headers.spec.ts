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

	// The CSP is authored in two independent places — the web shell
	// (svelte.config.js, injected into the document) and the Tauri desktop
	// shell (tauri.conf.json). These tests assert both carry the identical
	// hardened directive set so the two can never silently drift apart.
	const REQUIRED_CSP: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': ["'self'"],
		'style-src': ["'self'", "'unsafe-inline'"],
		'img-src': ["'self'", 'data:'],
		'media-src': ["'self'"],
		'object-src': ["'none'"],
		'base-uri': ["'self'"],
		'frame-ancestors': ["'none'"],
		'worker-src': ["'self'"],
		'manifest-src': ["'self'"]
	};

	// SvelteKit quotes these keyword source tokens when it serializes the CSP;
	// schemes (data:, ipc:) and hosts are left bare. Normalize both sources to
	// the same quoted form before comparing.
	const CSP_KEYWORDS = new Set(['self', 'none', 'unsafe-inline', 'unsafe-eval', 'strict-dynamic']);
	const quote = (token: string): string => (CSP_KEYWORDS.has(token) ? `'${token}'` : token);

	function parseCspString(csp: string): Map<string, Set<string>> {
		const map = new Map<string, Set<string>>();
		for (const part of csp.split(';')) {
			const [name, ...sources] = part.trim().split(/\s+/).filter(Boolean);
			if (name) map.set(name, new Set(sources));
		}
		return map;
	}

	async function webCsp(): Promise<Map<string, Set<string>>> {
		const { default: config } = await import('../../../svelte.config.js');
		const directives = (config.kit?.csp?.directives ?? {}) as Record<string, string[]>;
		const map = new Map<string, Set<string>>();
		for (const [name, arr] of Object.entries(directives)) {
			map.set(name, new Set(arr.map(quote)));
		}
		return map;
	}

	function tauriCsp(): Map<string, Set<string>> {
		const raw = readFileSync(resolve(ROOT, 'src-tauri/tauri.conf.json'), 'utf8');
		const config = JSON.parse(raw) as { app?: { security?: { csp?: string } } };
		return parseCspString(config.app?.security?.csp ?? '');
	}

	function assertRequiredDirectives(csp: Map<string, Set<string>>, label: string): void {
		for (const [name, tokens] of Object.entries(REQUIRED_CSP)) {
			expect(csp.has(name), `${label} missing ${name}`).toBe(true);
			expect([...(csp.get(name) ?? [])].sort(), `${label} ${name} mismatch`).toEqual(
				[...tokens].sort()
			);
		}
	}

	it('web CSP (svelte.config.js) carries the hardened directive set', async () => {
		const csp = await webCsp();
		assertRequiredDirectives(csp, 'svelte.config.js');
		// Web shell makes no exceptions: connect-src is self-only.
		expect([...(csp.get('connect-src') ?? [])]).toEqual(["'self'"]);
	});

	it('desktop CSP (tauri.conf.json) matches the web directives', () => {
		const csp = tauriCsp();
		assertRequiredDirectives(csp, 'tauri.conf.json');
		// The one intentional delta: Tauri's IPC channel. No other network origin.
		expect([...(csp.get('connect-src') ?? [])].sort()).toEqual(
			["'self'", 'http://ipc.localhost', 'ipc:'].sort()
		);
	});
});
