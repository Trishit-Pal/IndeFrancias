import { test, expect, type Page } from '@playwright/test';

// Probes the real (built) CSP for the two blob: usages in the speech feature.
// Both are CONFIRMED CSP violations today (slice A6); they are marked test.fail() so the suite
// stays green and the bug stays visible. When the owner approves the CSP amendment
// (media-src 'self' blob:; connect-src 'self' blob:), delete the test.fail() lines.

/** Runs fetch(url) inside a blob: worker (the way vosk-browser loads its model); returns the outcome. */
async function fetchInBlobWorker(page: Page, target: 'same-origin' | 'blob'): Promise<string> {
	return page.evaluate(async (kind) => {
		const url = kind === 'blob' ? URL.createObjectURL(new Blob(['model'])) : location.origin + '/';
		// Worker console output is not forwarded to the page, so the worker reports the outcome.
		const src = `fetch(${JSON.stringify(url)}).then(() => postMessage('ok'), (e) => postMessage('blocked: ' + e.message));`;
		const worker = new Worker(URL.createObjectURL(new Blob([src])));
		return new Promise<string>((resolve) => (worker.onmessage = (e) => resolve(String(e.data))));
	}, target);
}

test('RecordCompare: a blob: recording URL can be played (media-src)', async ({ page }) => {
	// Pending CSP decision: media-src 'self' does not allow blob: (RecordCompare.svelte playBack).
	test.fail();
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (/content security policy/i.test(msg.text())) errors.push(msg.text());
	});
	await page.goto('/');
	await page.evaluate(async () => {
		// Same shape as RecordCompare: new Audio(URL.createObjectURL(blob)).play()
		const url = URL.createObjectURL(new Blob([new Uint8Array(64)], { type: 'audio/webm' }));
		await new Audio(url).play().catch(() => undefined);
	});
	await page.waitForTimeout(500);
	expect(errors).toEqual([]);
});

test('control: a blob: worker can fetch a same-origin URL', async ({ page }) => {
	await page.goto('/');
	expect(await fetchInBlobWorker(page, 'same-origin')).toBe('ok');
});

test('Speaking pack: a blob: model URL can be fetched in a worker (connect-src)', async ({
	page
}) => {
	// Pending CSP decision: connect-src 'self' does not allow blob: (modelSource.ts getModelUrl).
	test.fail();
	await page.goto('/');
	expect(await fetchInBlobWorker(page, 'blob')).toBe('ok');
});
