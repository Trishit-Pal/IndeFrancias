import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson, exportBackupViaSettings, importBackupFile } from './helpers';

async function reachExercisePhase(page: import('@playwright/test').Page) {
	const check = page.getByTestId('check');
	const mcq = page.getByTestId('mcq-option');
	const bridgeContinue = page.getByTestId('bridge-quiz-continue');

	for (let attempt = 0; attempt < 12; attempt++) {
		if (
			await check
				.or(mcq)
				.first()
				.isVisible()
				.catch(() => false)
		)
			return;

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

	await expect(check.or(mcq).first()).toBeVisible({ timeout: 15_000 });
}

test('MCQ exercise is keyboard operable', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await reachExercisePhase(page);

	const mcq = page.getByTestId('mcq-option');
	const check = page.getByTestId('check');
	if (await mcq.count()) {
		await mcq.first().focus();
		await page.keyboard.press('Enter');
		await expect(check).toBeEnabled();
		await check.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByTestId('feedback')).toBeVisible();
		await expect(page.getByTestId('feedback')).toHaveAttribute('aria-live', 'polite');
	}
});

test('review grade buttons are focusable after reveal', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);

	if (await page.getByRole('link', { name: 'Review now' }).count()) {
		await page.getByRole('link', { name: 'Review now' }).click();
		const ctx = page.getByTestId('context-card');
		await expect(ctx.or(page.getByTestId('reveal')).first()).toBeVisible();
		if (await ctx.isVisible().catch(() => false)) {
			await page.getByTestId('context-choice').first().focus();
			await page.keyboard.press('Enter');
			await expect(page.getByTestId('context-feedback')).toHaveAttribute('aria-live', 'polite');
			return;
		}
		await page.getByTestId('reveal').click();
		const gradeBtn = page.locator('[data-grade="good"]');
		await expect(gradeBtn).toBeVisible();
		await gradeBtn.focus();
		await expect(gradeBtn).toBeFocused();
	}
});

test('modal traps Tab focus and restores focus to the opener on Escape', async ({ page }) => {
	await gotoHome(page);
	const backupJson = await exportBackupViaSettings(page);

	// Focus a known control first: showModal() must hand focus back to it on close.
	const opener = page.getByTestId('backup-export');
	await opener.focus();
	await importBackupFile(page, backupJson, false);

	const dialog = page.getByTestId('import-preview');
	await expect(dialog).toBeVisible();

	// Tab repeatedly: focus may briefly leave the document (browser UI → body),
	// but must never land on a page control behind the modal.
	for (let i = 0; i < 10; i++) {
		await page.keyboard.press('Tab');
		const escaped = await page.evaluate(() => {
			const active = document.activeElement;
			const modal = document.querySelector('[data-testid="import-preview"]');
			return !!active && active !== document.body && !modal?.contains(active);
		});
		expect(escaped, `Tab #${i + 1} escaped the modal`).toBe(false);
	}

	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(opener).toBeFocused();
});
