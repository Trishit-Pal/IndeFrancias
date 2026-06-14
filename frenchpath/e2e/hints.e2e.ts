import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

async function reachExercisePhase(page: import('@playwright/test').Page) {
	const check = page.getByTestId('check');
	const mcq = page.getByTestId('mcq-option');
	const bridgeContinue = page.getByTestId('bridge-quiz-continue');
	const summary = page.getByTestId('summary');

	for (let attempt = 0; attempt < 12; attempt++) {
		if (
			await check
				.or(mcq)
				.first()
				.isVisible()
				.catch(() => false)
		)
			return;
		if (await summary.isVisible().catch(() => false)) return;

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

		const start = page.getByTestId('start-lesson');
		if (await start.isVisible().catch(() => false)) await start.click();
	}

	await expect(check.or(mcq).or(summary).first()).toBeVisible({ timeout: 15_000 });
}

test('lesson hint button reveals hint text', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await reachExercisePhase(page);

	const hint = page.getByTestId('lesson-hint');
	await expect(hint).toBeVisible();
	await hint.click();
	await expect(page.getByTestId('exercise-hint')).toBeVisible();
});
