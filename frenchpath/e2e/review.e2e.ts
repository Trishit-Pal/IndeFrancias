import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson } from './helpers';

test('fresh learner sees empty review state', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/review');
	await expect(page.getByTestId('no-reviews')).toBeVisible();
});

// Flip cards only appear for young cards without an example sentence, which the
// first lesson's queue does not guarantee. So this drives the shipped stylesheet
// with the flip markup directly: under Reduce Motion nothing rotates, and the
// revealed card must swap faces or the answer is never shown.
test('reduce motion: a revealed flip card shows its back face', async ({ page }) => {
	await gotoHome(page); // seeds reduceMotion: true
	await page.goto('/review');
	await expect(page.locator('html')).toHaveClass(/reduce-motion/);
	await page.evaluate(() => {
		document.body.insertAdjacentHTML(
			'beforeend',
			`<div class="fp-flip-card"><div class="fp-flip-inner fp-flipped">
				<section class="fp-flip-front" data-testid="probe-front">front</section>
				<section class="fp-flip-back" data-testid="probe-back">back</section>
			</div></div>`
		);
	});
	await expect(page.getByTestId('probe-back')).toHaveCSS('transform', 'none');
	await expect(page.getByTestId('probe-front')).toBeHidden();
});

test('due badge reflects cards after lesson completion', async ({ page }) => {
	await gotoHome(page);
	await expect(page.getByTestId('due-badge')).toHaveCount(0);

	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();

	await expect(page.getByTestId('due-badge')).toBeVisible();
});
