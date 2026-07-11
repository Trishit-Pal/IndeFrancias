import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { gotoHome, completeLesson, skipOnboardingViaIdb } from './helpers';

const PASSPHRASE = 'test-phrase-123';

test('sync round-trip merges progress from another device', async ({ page }) => {
	test.setTimeout(60_000);
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();

	// "Device A": export an encrypted sync file of the progress just made.
	await page.goto('/settings');
	await page.getByTestId('sync-passphrase').fill(PASSPHRASE);
	const downloadPromise = page.waitForEvent('download');
	await page.getByTestId('sync-export').click();
	const download = await downloadPromise;
	const filePath = await download.path();
	if (!filePath) throw new Error('Download path missing');
	const syncJson = await readFile(filePath, 'utf8');

	// Simulate "device B": wipe local progress, then re-onboard.
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

	// Import the sync file back in: preview then confirm merges the progress back.
	await page.goto('/settings');
	await page.getByTestId('sync-passphrase').fill(PASSPHRASE);
	await page.getByTestId('sync-import').setInputFiles({
		name: 'device-a.fpsync',
		mimeType: 'application/json',
		buffer: Buffer.from(syncJson)
	});
	await expect(page.getByTestId('sync-preview')).toBeVisible();
	await Promise.all([page.waitForEvent('load'), page.getByTestId('sync-confirm').click()]);

	await page.getByRole('navigation').getByRole('link', { name: 'Learn' }).click();
	await expect(page.getByTestId('unit-card').first()).toContainText('✓');
});

test('wrong passphrase on sync import shows a friendly error, not a raw exception', async ({
	page
}) => {
	await gotoHome(page);
	await page.goto('/settings');
	await page.getByTestId('sync-passphrase').fill(PASSPHRASE);
	const downloadPromise = page.waitForEvent('download');
	await page.getByTestId('sync-export').click();
	const download = await downloadPromise;
	const filePath = await download.path();
	if (!filePath) throw new Error('Download path missing');
	const syncJson = await readFile(filePath, 'utf8');

	await page.getByTestId('sync-passphrase').fill('wrong');
	await page.getByTestId('sync-import').setInputFiles({
		name: 'device-a.fpsync',
		mimeType: 'application/json',
		buffer: Buffer.from(syncJson)
	});
	await expect(page.getByTestId('settings-message')).toContainText(/passphrase/i);
	await expect(page.getByTestId('sync-preview')).not.toBeVisible();
});
