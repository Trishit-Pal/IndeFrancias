import { test, expect } from '@playwright/test';
import {
	gotoHome,
	completeLesson,
	exportBackupViaSettings,
	importBackupFile,
	skipOnboardingViaIdb
} from './helpers';

test('backup round-trip restores progress after reset', async ({ page }) => {
	test.setTimeout(60_000);
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();

	const backupJson = await exportBackupViaSettings(page);

	await page.getByTestId('reset-progress').click();
	await page.getByTestId('reset-confirm').click();
	await expect(page.getByTestId('reset-progress')).toBeVisible({ timeout: 15_000 });

	await page.goto('/');
	await expect(
		page.getByTestId('onboarding-wizard').or(page.getByTestId('unit-card').first())
	).toBeVisible();
	if (await page.getByTestId('onboarding-wizard').isVisible()) {
		await skipOnboardingViaIdb(page);
		await page.reload();
	}
	await expect(page.getByTestId('unit-card').first()).not.toContainText('✓');

	await importBackupFile(page, backupJson);
	await page.getByRole('navigation').getByRole('link', { name: 'Learn' }).click();
	await expect(page.getByTestId('unit-card').first()).toContainText('✓');
});

test('corrupt backup shows error and preserves existing progress', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();

	await page.goto('/settings');
	await page.getByTestId('backup-file-input').setInputFiles({
		name: 'bad.json',
		mimeType: 'application/json',
		buffer: Buffer.from('{not valid json')
	});
	await expect(page.getByTestId('settings-message')).toContainText(/valid JSON|failed/i);

	await page.goto('/');
	await expect(page.getByTestId('unit-card').first()).toContainText('✓');
});

test('export shows last export timestamp', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	await page.getByTestId('backup-export').click();
	await expect(page.getByTestId('last-export')).toBeVisible();
});

test('reset clears progress and shows onboarding again', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();

	await page.goto('/settings');
	await page.getByTestId('reset-progress').click();
	await page.getByTestId('reset-confirm').click();
	await expect(page.getByTestId('reset-progress')).toBeVisible({ timeout: 15_000 });

	await page.goto('/', { waitUntil: 'domcontentloaded' });

	await expect(page.getByTestId('onboarding-wizard')).toBeVisible();
});

test('tampered backup checksum is rejected', async ({ page }) => {
	await gotoHome(page);
	const json = await exportBackupViaSettings(page);
	const file = JSON.parse(json) as { checksum: string };
	file.checksum = 'tampered';
	await page.goto('/settings');
	await page.getByTestId('backup-file-input').setInputFiles({
		name: 'bad-checksum.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(file))
	});
	await expect(page.getByTestId('settings-message')).toContainText(/checksum|integrity|failed/i);
});
