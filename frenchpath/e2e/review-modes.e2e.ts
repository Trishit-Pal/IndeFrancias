import { test, expect, type Page } from '@playwright/test';
import { MODEL_URL_PATH } from '../src/lib/speech/modelManifest';
import { gotoHome, completeLesson, reviewUntilDone } from './helpers';

async function stubFrenchTts(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as { __spoken: string[] };
		w.__spoken = [];
		// a plain object can't be assigned to a native utterance's `voice`, so stub that too
		Object.defineProperty(window, 'SpeechSynthesisUtterance', {
			value: class {
				constructor(public text: string) {}
			}
		});
		const voice = { lang: 'fr-FR', name: 'Stub', voiceURI: 'stub', localService: true };
		Object.defineProperty(window, 'speechSynthesis', {
			value: {
				getVoices: () => [voice],
				addEventListener: () => {},
				removeEventListener: () => {},
				speak: (u: SpeechSynthesisUtterance) => w.__spoken.push(u.text),
				cancel: () => {}
			}
		});
	});
}

/** Wait for the service worker so a hard load of `/review?mode=x` hits the precached shell. */
async function swReady(page: Page) {
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
}

async function openReview(page: Page, mode: string) {
	await swReady(page);
	await page.goto(`/review?mode=${mode}`);
}

async function learnOneUnit(page: Page) {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
}

test('listen mode hides the sentence until a choice is made', async ({ page }) => {
	await stubFrenchTts(page);
	await learnOneUnit(page);
	await openReview(page, 'listen');
	await expect(page.getByTestId('listen-replay')).toBeVisible();
	await expect(page.getByTestId('context-sentence')).toHaveCount(0);
	await expect
		.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length))
		.toBeGreaterThan(0);
	await page.getByTestId('listen-replay').click();
	await page.getByTestId('context-choice').first().click();
	await expect(page.getByTestId('context-feedback')).not.toBeEmpty();
	await page.getByTestId('continue').click();
});

test('type mode grades a typed answer and shows feedback', async ({ page }) => {
	await learnOneUnit(page);
	await openReview(page, 'type');
	await expect(page.getByTestId('recall-input')).toBeVisible();
	await page.getByTestId('recall-input').fill('zzz');
	await page.getByTestId('recall-input').press('Enter');
	await expect(page.getByTestId('context-feedback')).not.toBeEmpty();
	await expect(page.getByTestId('recall-input')).toBeDisabled();
	await page.getByTestId('continue').click();
});

test('mature cards use typed recall even in read mode', async ({ page }) => {
	await learnOneUnit(page);
	await page.evaluate(async () => {
		const db = await new Promise<IDBDatabase>((res, rej) => {
			const req = indexedDB.open('frenchpath', 2);
			req.onerror = () => rej(req.error);
			req.onsuccess = () => res(req.result);
		});
		await new Promise<void>((res, rej) => {
			const tx = db.transaction('srsCards', 'readwrite');
			const store = tx.objectStore('srsCards');
			store.openCursor().onsuccess = (e) => {
				const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
				if (!cur) return;
				cur.update({
					...cur.value,
					stability: 30,
					difficulty: 5,
					state: 2,
					reps: 5,
					last_review: new Date(Date.now() - 30 * 86_400_000),
					due: new Date(Date.now() - 1000)
				});
				cur.continue();
			};
			tx.oncomplete = () => {
				db.close();
				res();
			};
			tx.onerror = () => rej(tx.error);
		});
	});
	await page.goto('/review');
	await expect(page.getByTestId('recall-input')).toBeVisible();
	await expect(page.getByTestId('context-choice')).toHaveCount(0);
	await reviewUntilDone(page);
});

test('hard-loading /review?mode=type with the service worker renders Review, not Home', async ({
	page
}) => {
	await gotoHome(page);
	await swReady(page);
	await page.goto('/review?mode=type');
	await expect(page.getByTestId('no-reviews')).toBeVisible();
	await expect(page.getByTestId('path-scene')).toHaveCount(0);
});

/** Web has no bundled model: make getModelStatus() honestly report ready via Cache Storage. */
async function seedModelCache(page: Page) {
	await page.addInitScript(
		([cacheName, path]) => {
			void caches.open(cacheName).then((c) => c.put(path, new Response('x')));
		},
		['fp-asr-model', MODEL_URL_PATH]
	);
}

async function stubAsr(page: Page) {
	await page.addInitScript(() => {
		localStorage.setItem('fp-e2e-stub-asr', JSON.stringify([{ word: 'bonjour', conf: 1 }]));
	});
}

test('speak mode records, scores and shows feedback; type instead falls back', async ({ page }) => {
	await stubAsr(page);
	await seedModelCache(page);
	await learnOneUnit(page);
	await openReview(page, 'speak');
	const say = page.getByTestId('speak-answer');
	await expect(say).toBeVisible();
	await expect(page.getByTestId('recall-input')).toHaveCount(0);
	await say.click();
	await expect(say).toContainText('Stop');
	await say.click();
	await expect(page.getByTestId('context-feedback')).not.toBeEmpty();
	await page.getByTestId('continue').click();
});

test('speak mode: Type instead switches to typed recall', async ({ page }) => {
	await stubAsr(page);
	await seedModelCache(page);
	await learnOneUnit(page);
	await openReview(page, 'speak');
	await page.getByTestId('speak-type-instead').click();
	await expect(page.getByTestId('recall-input')).toBeVisible();
	await expect(page.getByTestId('speak-answer')).toHaveCount(0);
	await reviewUntilDone(page);
});

test('speak mode requests the mic only on the Say it tap, not on mount', async ({ page }) => {
	await stubAsr(page);
	await seedModelCache(page);
	await page.addInitScript(() => {
		const w = window as unknown as { __gumCalls: number };
		w.__gumCalls = 0;
		const md = navigator.mediaDevices;
		const real = md.getUserMedia.bind(md);
		md.getUserMedia = (c) => {
			w.__gumCalls++;
			return real(c);
		};
	});
	await learnOneUnit(page);
	await openReview(page, 'speak');
	const say = page.getByTestId('speak-answer');
	await expect(say).toBeVisible();
	const calls = () => page.evaluate(() => (window as unknown as { __gumCalls: number }).__gumCalls);
	expect(await calls()).toBe(0);
	await say.click();
	await expect(say).toContainText('Stop');
	expect(await calls()).toBe(1);
});

/** Make every card due and mature; only the first gets `lapses`, the rest get 2. */
async function seedCards(page: Page, patch: { lapses: number }) {
	await page.evaluate(async (lapses) => {
		const db = await new Promise<IDBDatabase>((res, rej) => {
			const req = indexedDB.open('frenchpath', 2);
			req.onerror = () => rej(req.error);
			req.onsuccess = () => res(req.result);
		});
		await new Promise<void>((res, rej) => {
			const tx = db.transaction('srsCards', 'readwrite');
			let first = true;
			tx.objectStore('srsCards').openCursor().onsuccess = (e) => {
				const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
				if (!cur) return;
				cur.update({
					...cur.value,
					lapses: first ? lapses : 2,
					stability: 30,
					difficulty: 5,
					state: 2,
					reps: 5,
					last_review: new Date(Date.now() - 30 * 86_400_000),
					due: new Date(Date.now() - 1000)
				});
				first = false;
				cur.continue();
			};
			tx.oncomplete = () => {
				db.close();
				res();
			};
			tx.onerror = () => rej(tx.error);
		});
	}, patch.lapses);
}

test('leech card shows the rescue panel once, then the card; non-leeches skip it', async ({
	page
}) => {
	await learnOneUnit(page);
	await seedCards(page, { lapses: 3 });
	await page.goto('/review');
	const panel = page.getByTestId('leech-rescue');
	await expect(panel).toBeVisible();
	await expect(page.getByTestId('recall-input')).toHaveCount(0);
	await page.getByTestId('leech-got-it').click();
	await expect(panel).toHaveCount(0);
	await expect(page.getByTestId('recall-input')).toBeVisible();
	// once per card per session: grading moves on, and no card shows the panel a second time
	await page.getByTestId('recall-input').fill('x');
	await page.getByTestId('recall-check').click();
	await page.getByTestId('continue').click();
	await expect(
		page.getByTestId('recall-input').or(page.getByTestId('review-done')).first()
	).toBeVisible();
	await expect(panel).toHaveCount(0);
});

test('non-leech cards go straight to the card', async ({ page }) => {
	await learnOneUnit(page);
	await seedCards(page, { lapses: 2 });
	await page.goto('/review');
	await expect(page.getByTestId('recall-input')).toBeVisible();
	await expect(page.getByTestId('leech-rescue')).toHaveCount(0);
});
