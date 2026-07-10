// Where the ASR model lives per platform. Native (.apk) and desktop (.exe):
// bundled in the app at MODEL_URL_PATH. Web: opt-in download (same-origin),
// SHA-256-verified, persisted in Cache Storage. The web CSP stays default-src 'self'.
import { isNativePlatform, isDesktopPlatform } from '../platform';
import { MODEL_URL_PATH, MODEL_SHA256 } from './modelManifest';

const CACHE_NAME = 'fp-asr-model';

/** True when the model ships inside the app bundle (no download needed). */
function isModelBundled(): boolean {
	return isNativePlatform() || isDesktopPlatform();
}

async function sha256HexOf(buf: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', buf);
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getModelStatus(): Promise<'ready' | 'needs-download'> {
	if (isModelBundled()) return 'ready';
	const cache = await caches.open(CACHE_NAME);
	return (await cache.match(MODEL_URL_PATH)) ? 'ready' : 'needs-download';
}

export async function downloadModel(onProgress?: (pct: number) => void): Promise<void> {
	const res = await fetch(MODEL_URL_PATH);
	if (!res.ok || !res.body) throw new Error(`Speaking pack download failed (HTTP ${res.status}).`);
	const total = Number(res.headers.get('content-length')) || 0;
	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let received = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		received += value.byteLength;
		if (total && onProgress) onProgress(Math.round((received / total) * 100));
	}
	const blob = new Blob(chunks as BlobPart[]);
	const hash = await sha256HexOf(await blob.arrayBuffer());
	if (hash !== MODEL_SHA256) {
		throw new Error('Speaking pack failed its integrity (hash) check — nothing was saved.');
	}
	const cache = await caches.open(CACHE_NAME);
	await cache.put(MODEL_URL_PATH, new Response(blob));
}

export async function getModelUrl(): Promise<string> {
	if (isModelBundled()) return MODEL_URL_PATH;
	const cache = await caches.open(CACHE_NAME);
	const hit = await cache.match(MODEL_URL_PATH);
	if (!hit) throw new Error('Speaking pack not downloaded yet.');
	return URL.createObjectURL(await hit.blob());
}
