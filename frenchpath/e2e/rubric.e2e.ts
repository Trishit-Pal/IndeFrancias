import { test, expect, type Page } from '@playwright/test';
import { gotoHome } from './helpers';

/**
 * Drives a1-unit-01 from the unit card through its bridge quiz and the two
 * leading mcq exercises (ex1, ex2), stopping once ex3 (the seeded cloze) is
 * on screen. Mirrors the bridge-quiz loop in hints.e2e.ts's
 * reachExercisePhase and the exercise-answering loop in helpers.ts's
 * completeLesson.
 */
async function reachSeededCloze(page: Page) {
	const bridgeContinue = page.getByTestId('bridge-quiz-continue');
	const start = page.getByTestId('start-lesson');
	const mcq = page.getByTestId('mcq-option');
	const check = page.getByTestId('check');
	const cloze = page.getByTestId('cloze-input');

	for (let attempt = 0; attempt < 12; attempt++) {
		if (await cloze.isVisible().catch(() => false)) return;

		if (await bridgeContinue.isVisible().catch(() => false)) {
			const options = page.getByTestId('bridge-quiz-option');
			const count = await options.count();
			for (let i = 0; i < count; i++) {
				await options.nth(i).click();
				if (await bridgeContinue.isEnabled().catch(() => false)) break;
			}
			await bridgeContinue.click();
			continue;
		}

		if (await start.isVisible().catch(() => false)) {
			await start.click();
			continue;
		}

		if (await mcq.first().isVisible().catch(() => false)) {
			await mcq.first().click();
			await expect(check).toBeEnabled();
			await check.click();
			await page.getByTestId('continue').click();
			continue;
		}
	}

	await expect(cloze).toBeVisible({ timeout: 15_000 });
}

test('a wrong answer matching a rubric rule shows a hint chip', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await reachSeededCloze(page);

	await page.getByTestId('cloze-input').fill('je suis 25');
	await page.getByTestId('check').click();
	await expect(page.getByTestId('rubric-hint')).toBeVisible();
	await expect(page.getByTestId('rubric-hint')).toContainText('avoir');
});
