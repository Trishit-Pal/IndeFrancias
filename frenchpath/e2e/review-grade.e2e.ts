import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson, reachFlipCard } from './helpers';

// Flip-card path: grading awaits an IndexedDB write. A second tap while that
// write is pending must not grade the same card twice (it would corrupt FSRS).
test('a double tap on a grade button records exactly one review', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.goto('/review');
	// New cards open as context cards (graded from evidence) when their sentence
	// allows it; the rest are flip cards with grade buttons.
	test.skip(!(await reachFlipCard(page)), 'no flip card (grade buttons) reached in this queue');

	const progress = page.getByText(/^\d+ \/ \d+ due$/);
	const [before, total] = (await progress.textContent())!.match(/\d+/g)!.map(Number);
	test.skip(total < before + 2, 'need at least two more cards to observe a double advance');

	await page.getByTestId('reveal').click();
	const good = page.locator('[data-grade="good"]');
	await expect(good).toBeVisible();
	// E2E settings run with Reduce Motion on: the card can't rotate, so the faces
	// must swap. (Playwright counts a backface-hidden element as visible, hence
	// the computed-style checks.)
	await expect(page.locator('.fp-flip-front')).toBeHidden();
	await expect(page.getByTestId('card-back')).toHaveCSS('transform', 'none');
	// Two clicks in the same task, before any await can resolve.
	await good.evaluate((b) => {
		(b as HTMLButtonElement).click();
		(b as HTMLButtonElement).click();
	});
	await expect(progress).toHaveText(new RegExp(`^${before + 1} / ${total} due$`));
});

// Each grade says when the card would come back, and 1–4 grade it once revealed.
test('flip card: grades show their interval and a number key grades the card', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.goto('/review');
	test.skip(!(await reachFlipCard(page)), 'no flip card (grade buttons) reached in this queue');

	const progress = page.getByText(/^\d+ \/ \d+ due$/);
	const [before, total] = (await progress.textContent())!.match(/\d+/g)!.map(Number);

	// Before the answer is shown a digit is not a grade.
	await page.keyboard.press('3');
	await expect(page.getByTestId('reveal')).toBeVisible();
	await expect(progress).toHaveText(`${before} / ${total} due`);

	await page.getByTestId('reveal').click();
	const intervals = page.getByTestId('grade-interval');
	await expect(intervals).toHaveCount(4);
	for (let i = 0; i < 4; i++) await expect(intervals.nth(i)).toHaveText(/\d/);
	// Focus lands on the group, not on a grade, so a held Enter cannot grade by accident.
	await expect(page.getByTestId('grade-buttons')).toBeFocused();

	await page.keyboard.press('3');
	if (before < total) await expect(progress).toHaveText(`${before + 1} / ${total} due`);
	else await expect(page.getByTestId('review-done')).toBeVisible();
});
