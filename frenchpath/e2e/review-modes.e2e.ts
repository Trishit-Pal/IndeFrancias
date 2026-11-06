import { test, expect, type Page } from '@playwright/test';
import { gotoHome, completeLesson, reviewUntilDone } from './helpers';
// the service worker would bypass the route() fulfilment in openReviewtest.use({ serviceWorkers: 'block' });

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

/**
 * Client-side nav like the Today card: `vite preview` serves the home shell for a full load
 * of `/review?mode=x`, so retarget the Today link and click it.
 */
async function openReview(page: Page, mode: string) {
	await page.goto('/progress');
	const start = page.getByTestId('today-start');
	await expect(start).toBeVisible();
	await start.evaluate((el, m) => el.setAttribute('href', `/review?mode=${m}`), mode);
	await start.click();
	await expect(page).toHaveURL(new RegExp(`mode=${mode}$`));
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
	await reviewUntilDone(page);
});
