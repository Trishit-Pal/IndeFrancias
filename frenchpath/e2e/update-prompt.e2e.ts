import { test, expect, type Page } from '@playwright/test';
import { gotoHome, passBridgeQuiz } from './helpers';

// A new app version becomes ready while the app is open. The learner decides when to
// reload (SPEC invariant 6), and the prompt never interrupts a lesson, checkpoint,
// exam or review.
//
// The preview server (vite.config.ts, `preview-e2e-sw-bump`) serves a byte-different
// sw.js to requests carrying the fp-e2e-sw-bump cookie, which is how one build can
// produce "a new version".

/** Home, with the service worker in control of the page. */
async function openHomeUnderServiceWorker(page: Page) {
	await gotoHome(page);
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
		.toBe(true);
	await expect(page.getByTestId('unit-card').first()).toBeVisible();
}

/** Makes the browser find, install and park a new worker in the "waiting" state. */
async function makeNewVersionReady(page: Page) {
	// Origin root, so the cookie's path is `/` and the request for /sw.js carries it.
	const origin = new URL('/', page.url()).href;
	await page.context().addCookies([{ name: 'fp-e2e-sw-bump', value: '1', url: origin }]);
	await page.evaluate(async () => {
		await (await navigator.serviceWorker.getRegistration())?.update();
	});
	// expect.poll, not waitForFunction: an async predicate there is a truthy Promise.
	await expect
		.poll(
			() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting),
			{ timeout: 30_000 }
		)
		.toBe(true);
}

const markDocument = (page: Page) =>
	page.evaluate(() => {
		(window as unknown as { __sameDocument?: boolean }).__sameDocument = true;
	});
const isSameDocument = (page: Page) =>
	page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument === true);

test('a new version shows the update prompt, never reloads by itself, and Update reloads', async ({
	page
}) => {
	await openHomeUnderServiceWorker(page);
	await markDocument(page);

	await makeNewVersionReady(page);
	const toast = page.getByTestId('update-toast');
	await expect(toast).toBeVisible();
	// The page the learner was on is still the same document: nothing reloaded on its own.
	expect(await isSameDocument(page)).toBe(true);

	await toast.getByRole('button').first().click();
	await expect.poll(() => isSameDocument(page).catch(() => false)).toBe(false);
	await expect(page.getByTestId('unit-card').first()).toBeVisible();
	await expect(toast).toHaveCount(0);
	expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
});

test('the update prompt waits while a lesson is open and appears after leaving it', async ({
	page
}) => {
	await openHomeUnderServiceWorker(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	// Through the optional bridge quiz to the first exercise, where the exit control lives.
	const exit = page.getByTestId('lesson-exit');
	const bridgeContinue = page.getByTestId('bridge-quiz-continue');
	await expect(exit.or(bridgeContinue).first()).toBeVisible();
	if (await bridgeContinue.isVisible()) await passBridgeQuiz(page);
	await expect(exit).toBeVisible();
	await markDocument(page);

	await makeNewVersionReady(page);
	const toast = page.getByTestId('update-toast');
	// Give the app time to hear about the waiting worker before asserting it stays quiet.
	await page.waitForTimeout(1500);
	await expect(toast).toHaveCount(0);
	expect(await isSameDocument(page)).toBe(true);

	// Leave through the app (no reload): nothing was answered, so the exit is immediate.
	await exit.click();
	await expect(page).toHaveURL(/\/$/);
	await expect(toast).toBeVisible();
	expect(await isSameDocument(page)).toBe(true);
});

test('the update prompt leaves room to scroll the end of a page clear of it', async ({ page }) => {
	await openHomeUnderServiceWorker(page);
	await makeNewVersionReady(page);
	const toast = page.getByTestId('update-toast');
	await expect(toast).toBeVisible();

	// Settings ends with Reset and the About links: none may be stuck under the prompt.
	await page.locator('a[href="/settings"]:visible').first().click();
	await expect(page.getByTestId('about-section')).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

	await expect
		.poll(() =>
			page.evaluate(() => {
				const panel = document
					.querySelector('[data-testid="update-toast"]')!
					.firstElementChild!.getBoundingClientRect();
				const controls = document.querySelectorAll(
					'#main a, #main button, #main input, #main select'
				);
				return [...controls].filter((el) => {
					const r = el.getBoundingClientRect();
					return r.width > 0 && r.bottom > panel.top && r.top < panel.bottom;
				}).length;
			})
		)
		.toBe(0);
});
