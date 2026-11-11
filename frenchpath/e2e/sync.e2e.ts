import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { gotoHome, completeLesson, skipOnboardingViaIdb } from './helpers';
import { encryptPayload, decryptPayload, type EncryptedEnvelope } from '../src/lib/sync/crypto';
import { sha256Hex } from '../src/lib/pwa/checksum';

const PASSPHRASE = 'test-phrase-123';
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Re-signs a sync file after moving every lesson's lastVisited (the file is encrypted and checksummed). */
async function shiftLessonDates(syncJson: string, deltaMs: number): Promise<string> {
	const plaintext = await decryptPayload(JSON.parse(syncJson) as EncryptedEnvelope, PASSPHRASE);
	const file = JSON.parse(plaintext) as {
		checksum: string;
		payload: { progress: { lastVisited: number }[] };
	};
	file.payload.progress = file.payload.progress.map((p) => ({
		...p,
		lastVisited: p.lastVisited + deltaMs
	}));
	file.checksum = await sha256Hex(JSON.stringify(file.payload));
	return JSON.stringify(await encryptPayload(JSON.stringify(file), PASSPHRASE));
}

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
	await expect(page.getByTestId('sync-preview-safety-copy')).toBeVisible();
	await page.getByTestId('sync-confirm').click();
	await expect(page.getByTestId('sync-complete')).toBeVisible();
	await Promise.all([page.waitForEvent('load'), page.getByTestId('sync-reload').click()]);

	await page.getByRole('navigation').getByRole('link', { name: 'Learn' }).click();
	await expect(page.getByTestId('unit-card').first()).toContainText('✓');
});

test('sync import over existing progress saves a safety copy first and does not reload by itself', async ({
	page
}) => {
	test.setTimeout(60_000);
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();

	await page.goto('/settings');
	await page.getByTestId('sync-passphrase').fill(PASSPHRASE);
	const exportPromise = page.waitForEvent('download');
	await page.getByTestId('sync-export').click();
	const exported = await exportPromise;
	const exportPath = await exported.path();
	if (!exportPath) throw new Error('Download path missing');
	const syncJson = await readFile(exportPath, 'utf8');

	// Importing over the progress just made: there is something to lose, so a copy comes first.
	await page.getByTestId('sync-import').setInputFiles({
		name: 'same-device.fpsync',
		mimeType: 'application/json',
		buffer: Buffer.from(syncJson)
	});
	await expect(page.getByTestId('sync-preview')).toBeVisible();
	await expect(page.getByTestId('sync-preview-safety-copy')).toBeVisible();
	await expect(page.getByTestId('sync-preview-replaced')).toHaveCount(0);
	await page.evaluate(() => {
		(window as unknown as { __notReloaded: boolean }).__notReloaded = true;
	});
	const safetyCopy = page.waitForEvent('download');
	await page.getByTestId('sync-confirm').click();
	expect((await safetyCopy).suggestedFilename()).toMatch(/^frenchpath-backup-.*\.json$/);

	await expect(page.getByTestId('sync-complete')).toBeVisible();
	await expect(page.getByTestId('sync-complete')).toHaveAttribute('role', 'status');
	await expect(page.getByTestId('sync-reload')).toBeVisible();
	expect(
		await page.evaluate(() => (window as unknown as { __notReloaded?: boolean }).__notReloaded)
	).toBe(true);
});

test('sync preview cannot be cancelled or closed while the safety copy is being made', async ({
	page
}) => {
	test.setTimeout(60_000);
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();
	const syncJson = await exportSyncJson(page);

	await chooseSyncFile(page, syncJson);
	await expect(page.getByTestId('sync-preview')).toBeVisible();

	// Hold the safety copy open: building the backup hashes it with crypto.subtle.digest, so a gate
	// there keeps the import in flight until the test releases it (no timing luck).
	await page.evaluate(() => {
		const win = window as unknown as { __releaseCopy: () => void };
		const gate = new Promise<void>((resolve) => (win.__releaseCopy = resolve));
		const original = SubtleCrypto.prototype.digest;
		SubtleCrypto.prototype.digest = function (this: SubtleCrypto, ...args) {
			return gate.then(() => original.apply(this, args));
		};
	});
	const safetyCopy = page.waitForEvent('download');
	await page.getByTestId('sync-confirm').click();

	await expect(page.getByTestId('sync-confirm')).toBeDisabled();
	await expect(page.getByTestId('sync-cancel')).toBeDisabled();
	await page.keyboard.press('Escape');
	await expect(page.getByTestId('sync-preview')).toBeVisible();

	await page.evaluate(() => (window as unknown as { __releaseCopy: () => void }).__releaseCopy());
	expect((await safetyCopy).suggestedFilename()).toMatch(/^frenchpath-backup-.*\.json$/);
	await expect(page.getByTestId('sync-complete')).toBeVisible();
});

async function exportSyncJson(page: Page): Promise<string> {
	await page.goto('/settings');
	await page.getByTestId('sync-passphrase').fill(PASSPHRASE);
	const downloadPromise = page.waitForEvent('download');
	await page.getByTestId('sync-export').click();
	const filePath = await (await downloadPromise).path();
	if (!filePath) throw new Error('Download path missing');
	return readFile(filePath, 'utf8');
}

async function chooseSyncFile(page: Page, json: string): Promise<void> {
	await page.getByTestId('sync-import').setInputFiles({
		name: 'edited.fpsync',
		mimeType: 'application/json',
		buffer: Buffer.from(json)
	});
}

test('sync preview says how many existing items the file will replace', async ({ page }) => {
	test.setTimeout(60_000);
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();
	const syncJson = await exportSyncJson(page);

	// A file whose lessons were visited a minute later than this device's copy replaces them.
	await chooseSyncFile(page, await shiftLessonDates(syncJson, MINUTE_MS));
	await expect(page.getByTestId('sync-preview')).toBeVisible();
	await expect(page.getByTestId('sync-preview-safety-copy')).toBeVisible();
	await expect(page.getByTestId('sync-preview-replaced')).toContainText(/\b1\b.*updated/i);
});

test('sync file with dates in the future is refused with a friendly message', async ({ page }) => {
	test.setTimeout(60_000);
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();
	const syncJson = await exportSyncJson(page);

	await chooseSyncFile(page, await shiftLessonDates(syncJson, 3 * DAY_MS));
	await expect(page.getByTestId('settings-message')).toContainText(/both devices/i);
	await expect(page.getByTestId('sync-preview')).not.toBeVisible();
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
