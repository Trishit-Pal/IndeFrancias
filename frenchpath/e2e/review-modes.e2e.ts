import { test, expect, type Page } from '@playwright/test';
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
	// the e2e build bundles the speech model, so a speaking-tagged mature card may be speak
	await expect(
		page.getByTestId('recall-input').or(page.getByTestId('speak-answer')).first()
	).toBeVisible();
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

async function stubAsr(page: Page) {
	await page.addInitScript(() => {
		localStorage.setItem('fp-e2e-stub-asr', JSON.stringify([{ word: 'bonjour', conf: 1 }]));
	});
}

test('speak mode records, scores and shows feedback; type instead falls back', async ({ page }) => {
	await stubAsr(page);
	await learnOneUnit(page);
	await openReview(page, 'speak');
	const say = page.getByTestId('speak-answer');
	await expect(say).toBeVisible();
	await expect(page.getByTestId('recall-input')).toHaveCount(0);
	await say.click();
	await expect(say).toHaveAttribute('aria-pressed', 'true');
	await say.click();
	await expect(page.getByTestId('context-feedback')).not.toBeEmpty();
	await page.getByTestId('continue').click();
});

test('speak mode: Type instead switches to typed recall', async ({ page }) => {
	await stubAsr(page);
	await learnOneUnit(page);
	await openReview(page, 'speak');
	await page.getByTestId('speak-type-instead').click();
	await expect(page.getByTestId('recall-input')).toBeVisible();
	await expect(page.getByTestId('speak-answer')).toHaveCount(0);
	await reviewUntilDone(page);
});
