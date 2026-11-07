import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson } from './helpers';

// Flip-card path: grading awaits an IndexedDB write. A second tap while that
// write is pending must not grade the same card twice (it would corrupt FSRS).
test('a double tap on a grade button records exactly one review', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.goto('/review');
	const reveal = page.getByTestId('reveal');
	const ctx = page.getByTestId('context-card');
	await expect(reveal.or(ctx).first()).toBeVisible({ timeout: 15_000 });
	// New cards mostly open as context cards (graded from evidence). Answer those
	// until a flip card with grade buttons comes up; the queue is a lesson's words.
	for (let i = 0; i < 20 && !(await reveal.isVisible().catch(() => false)); i++) {
		if (
			await page
				.getByTestId('review-done')
				.isVisible()
				.catch(() => false)
		)
			break;
		if (await ctx.isVisible().catch(() => false)) {
			await page.getByTestId('context-choice').first().click();
			const cont = page.getByTestId('continue');
			if (await cont.isVisible().catch(() => false)) await cont.click();
		}
		if (
			await page
				.getByTestId('leech-got-it')
				.isVisible()
				.catch(() => false)
		)
			await page.getByTestId('leech-got-it').click();
	}
	if (!(await reveal.isVisible().catch(() => false)))
		test.skip(true, 'no flip card (grade buttons) reached in this queue');

	const progress = page.getByText(/^\d+ \/ \d+ due$/);
	const [before, total] = (await progress.textContent())!.match(/\d+/g)!.map(Number);
	test.skip(total < before + 2, 'need at least two more cards to observe a double advance');

	await reveal.click();
	const good = page.locator('[data-grade="good"]');
	await expect(good).toBeVisible();
	// Two clicks in the same task, before any await can resolve.
	await good.evaluate((b) => {
		(b as HTMLButtonElement).click();
		(b as HTMLButtonElement).click();
	});
	await expect(progress).toHaveText(new RegExp(`^${before + 1} / ${total} due$`));
});
