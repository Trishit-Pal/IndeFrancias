import { test, expect, type Page } from '@playwright/test';
import { beginCheckpoint, gotoHome } from './helpers';

// Lesson runner chrome: an exit control that confirms before discarding
// progress, and Enter submitting the current answer.

async function startFirstLesson(page: Page) {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	// Through the optional bridge quiz to the first exercise.
	for (let i = 0; i < 12; i++) {
		if (
			await page
				.getByTestId('check')
				.isVisible()
				.catch(() => false)
		)
			return;
		const cont = page.getByTestId('bridge-quiz-continue');
		if (await cont.isVisible().catch(() => false)) {
			const opts = page.getByTestId('bridge-quiz-option');
			for (let j = 0; j < (await opts.count()); j++) {
				await opts.nth(j).click();
				if (await cont.isEnabled().catch(() => false)) break;
			}
			await cont.click();
		}
	}
	await expect(page.getByTestId('check')).toBeVisible({ timeout: 15_000 });
}

test('exit control leaves immediately before any answer, confirms once there is progress', async ({
	page
}) => {
	await startFirstLesson(page);
	const exit = page.getByTestId('lesson-exit');
	await expect(exit).toBeVisible();
	await exit.click();
	await expect(page).toHaveURL(/\/$/);

	// Back in; answer something so leaving would discard progress.
	await startFirstLesson(page);
	const mcq = page.getByTestId('mcq-option');
	if (await mcq.count()) await mcq.first().click();
	else await page.getByTestId('text-answer').or(page.getByTestId('cloze-input')).first().fill('x');
	await page.getByTestId('lesson-exit').click();
	const confirm = page.getByTestId('lesson-exit-confirm');
	await expect(confirm).toBeVisible();
	await page.getByTestId('lesson-exit-stay').click();
	await expect(confirm).not.toBeVisible();
	await expect(page.getByTestId('check')).toBeVisible();
	await page.getByTestId('lesson-exit').click();
	await page.getByTestId('lesson-exit-leave').click();
	await expect(page).toHaveURL(/\/$/);
});

test('Enter inside a text answer submits it', async ({ page }) => {
	await startFirstLesson(page);
	// Walk to the first exercise with a text field (MCQ options are buttons, where
	// Enter rightly activates the option). Bounded: a lesson has ~8-12 exercises.
	for (let i = 0; i < 12; i++) {
		const field = page.getByTestId('text-answer').or(page.getByTestId('cloze-input')).first();
		if (await field.isVisible().catch(() => false)) {
			await field.fill('bonjour');
			await expect(page.getByTestId('check')).toBeEnabled();
			await field.press('Enter');
			await expect(page.getByTestId('feedback')).toBeVisible();
			return;
		}
		const mcq = page.getByTestId('mcq-option');
		if (await mcq.count()) await mcq.first().click();
		else {
			// Unknown exercise shape: let the suite's generic flow cover it.
			test.skip(true, 'no text exercise reached in this lesson');
		}
		await page.getByTestId('check').click();
		await page.getByTestId('continue').click();
		if (
			await page
				.getByTestId('confidence-pulse')
				.isVisible()
				.catch(() => false)
		)
			await page.getByTestId('confidence-ok').click();
		if (
			await page
				.getByTestId('summary')
				.isVisible()
				.catch(() => false)
		)
			break;
	}
	test.skip(true, 'no text exercise in the first lesson');
});

test('tab-bar navigation mid-lesson asks before discarding progress', async ({ page }) => {
	await startFirstLesson(page);
	const mcq = page.getByTestId('mcq-option');
	if (await mcq.count()) await mcq.first().click();
	else await page.getByTestId('text-answer').or(page.getByTestId('cloze-input')).first().fill('x');
	// The global nav stays live during a lesson; leaving through it must confirm too.
	await page
		.getByRole('link', { name: /^review$/i })
		.filter({ visible: true })
		.first()
		.click();
	await expect(page.getByTestId('lesson-exit-confirm')).toBeVisible();
	await expect(page).toHaveURL(/\/learn\//);
	await page.getByTestId('lesson-exit-leave').click();
	await expect(page).toHaveURL(/\/review/);
});

// The same guard covers the other sessions: a stray tab tap must not silently
// discard a 45-minute mock exam or a checkpoint attempt.
const tapReviewTab = (page: import('@playwright/test').Page) =>
	page
		.getByRole('link', { name: /^review$/i })
		.filter({ visible: true })
		.first()
		.click();

test('tab-bar navigation mid-exam asks before discarding the attempt', async ({ page }) => {
	await page.goto('/exam/delf-a2');
	await page.getByTestId('start-exam').click();
	await tapReviewTab(page);
	await expect(page.getByTestId('lesson-exit-confirm')).toBeVisible();
	await expect(page).toHaveURL(/\/exam\//);
	await page.getByTestId('lesson-exit-stay').click();
	await tapReviewTab(page);
	await page.getByTestId('lesson-exit-leave').click();
	await expect(page).toHaveURL(/\/review/);
});

test('tab-bar navigation mid-checkpoint asks before discarding the attempt', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/checkpoint/g1');
	await beginCheckpoint(page);
	await tapReviewTab(page);
	await expect(page.getByTestId('lesson-exit-confirm')).toBeVisible();
	await expect(page).toHaveURL(/\/checkpoint\//);
	await page.getByTestId('lesson-exit-leave').click();
	await expect(page).toHaveURL(/\/review/);
});
