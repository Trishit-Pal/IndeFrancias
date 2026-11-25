import { test, expect, type Page } from '@playwright/test';
import { gotoHome, completeLesson, reachFlipCard } from './helpers';

// Ending a review session, and what happens when saving a review fails.
// recordReview writes in one transaction that includes the reviewLog store;
// the hook below refuses that transaction while `__failReviewSave` is set.

async function openReviewWithFailureHook(page: Page) {
	await page.addInitScript(() => {
		const original = IDBDatabase.prototype.transaction;
		IDBDatabase.prototype.transaction = function (
			this: IDBDatabase,
			...args: Parameters<IDBDatabase['transaction']>
		) {
			const stores = ([] as string[]).concat(args[0] as string | string[]);
			const failing = (window as unknown as { __failReviewSave?: boolean }).__failReviewSave;
			if (failing && args[1] === 'readwrite' && stores.includes('reviewLog')) {
				throw new DOMException('test: review save refused', 'AbortError');
			}
			return original.apply(this, args);
		} as IDBDatabase['transaction'];
	});
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.goto('/review');
	await expect(page.getByTestId('context-card').or(page.getByTestId('reveal')).first()).toBeVisible(
		{ timeout: 15_000 }
	);
}

const failSaves = (page: Page, on: boolean) =>
	page.evaluate((value) => {
		(window as unknown as { __failReviewSave?: boolean }).__failReviewSave = value;
	}, on);

const enabledChoice = (page: Page) =>
	page.locator('[data-testid="context-choice"]:enabled').first();

async function hasChoiceCard(page: Page): Promise<boolean> {
	return enabledChoice(page)
		.isVisible()
		.catch(() => false);
}

const progress = (page: Page) => page.getByText(/^\d+ \/ \d+ due$/);

async function progressNumbers(page: Page): Promise<[number, number]> {
	const [current, total] = (await progress(page).textContent())!.match(/\d+/g)!.map(Number);
	return [current!, total!];
}

test('a failed save keeps the answered card, and Continue saves it on the next try', async ({
	page
}) => {
	await openReviewWithFailureHook(page);
	test.skip(!(await hasChoiceCard(page)), 'the first due card is not a 4-choice card');
	const [current, total] = await progressNumbers(page);
	test.skip(total < current + 1, 'need a next card to observe the advance');

	await page.keyboard.press('1');
	await expect(page.getByTestId('context-next-in')).toBeVisible();

	await failSaves(page, true);
	await page.getByTestId('continue').click();
	await expect(page.getByTestId('review-grade-error')).toBeVisible();
	await expect(progress(page)).toHaveText(new RegExp(`^${current} / ${total} due$`));

	await failSaves(page, false);
	await page.getByTestId('continue').click();
	await expect(progress(page)).toHaveText(new RegExp(`^${current + 1} / ${total} due$`));
	await expect(page.getByTestId('review-grade-error')).toHaveCount(0);
});

test('End session saves an answer whose first save failed, then shows the summary', async ({
	page
}) => {
	await openReviewWithFailureHook(page);
	test.skip(!(await hasChoiceCard(page)), 'the first due card is not a 4-choice card');

	await page.keyboard.press('1');
	await page.getByTestId('continue').click();
	const end = page.getByTestId('review-end');
	await expect(end).toBeVisible();
	test.skip(!(await hasChoiceCard(page)), 'the second due card is not a 4-choice card');

	await page.keyboard.press('1');
	await expect(page.getByTestId('context-next-in')).toBeVisible();
	await failSaves(page, true);
	await page.getByTestId('continue').click();
	await expect(page.getByTestId('review-grade-error')).toBeVisible();

	// Still failing: the answer cannot be saved, so the session must not end and drop it.
	await end.click();
	await expect(page.getByTestId('review-grade-error')).toBeVisible();
	await expect(page.getByTestId('review-done')).toHaveCount(0);

	await failSaves(page, false);
	await end.click();
	await expect(page.getByTestId('review-done')).toBeVisible();
	await expect(page.getByTestId('review-summary-cards')).toHaveText(/\b2\b/);
});

test('End session with an answered card goes to the summary without showing the next card', async ({
	page
}) => {
	await openReviewWithFailureHook(page);
	test.skip(!(await hasChoiceCard(page)), 'the first due card is not a 4-choice card');

	await page.keyboard.press('1');
	await page.getByTestId('continue').click();
	const end = page.getByTestId('review-end');
	await expect(end).toBeVisible();
	test.skip(!(await hasChoiceCard(page)), 'the second due card is not a 4-choice card');
	const [current, total] = await progressNumbers(page);
	test.skip(total < current + 1, 'need a next card that could be shown by mistake');

	await page.keyboard.press('1');
	await expect(page.getByTestId('context-next-in')).toBeVisible();

	// Record every queue position the page renders from here on.
	await page.evaluate(() => {
		const seen: string[] = [];
		(window as unknown as { __positionsSeen: string[] }).__positionsSeen = seen;
		new MutationObserver(() => {
			for (const p of document.querySelectorAll('p')) {
				const match = /^(\d+) \/ \d+ due$/.exec(p.textContent?.trim() ?? '');
				if (match && !seen.includes(match[1]!)) seen.push(match[1]!);
			}
		}).observe(document.body, { childList: true, subtree: true, characterData: true });
	});

	await end.click();
	await expect(page.getByTestId('review-done')).toBeVisible();
	await expect(page.getByTestId('review-summary-cards')).toHaveText(/\b2\b/);
	const seen = await page.evaluate(
		() => (window as unknown as { __positionsSeen: string[] }).__positionsSeen
	);
	expect(seen).not.toContain(String(current + 1));
});

test('End session still ends the session after a flip-card grade failed to save', async ({
	page
}) => {
	await openReviewWithFailureHook(page);
	test.skip(!(await reachFlipCard(page)), 'no flip card (grade buttons) reached in this queue');
	const end = page.getByTestId('review-end');
	test.skip(!(await end.isVisible().catch(() => false)), 'no card reviewed before the flip card');

	await page.getByTestId('reveal').click();
	await failSaves(page, true);
	await page.locator('[data-grade="good"]').click();
	await expect(page.getByTestId('review-grade-error')).toBeVisible();

	// Nothing is waiting to be saved, so the session can end even though the last grade failed.
	await end.click();
	await expect(page.getByTestId('review-done')).toBeVisible();
});
