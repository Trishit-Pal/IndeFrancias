import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

// RecordCompare on the new-words list: leaving it mid-recording must release the microphone,
// or the browser's recording indicator stays on. Uses the fake media flags in playwright.config.ts.
type StreamLog = { __fpStreams: MediaStream[] };

test('starting the lesson mid-recording stops the microphone', async ({ page }) => {
	await page.addInitScript(() => {
		const streams: MediaStream[] = [];
		(window as unknown as StreamLog).__fpStreams = streams;
		const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		navigator.mediaDevices.getUserMedia = async (constraints) => {
			const stream = await original(constraints);
			streams.push(stream);
			return stream;
		};
	});
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	const record = page.getByRole('button', { name: 'Record yourself' }).first();
	// A normal take still yields a playable recording.
	await record.click();
	await page.getByRole('button', { name: 'Stop recording' }).click();
	await expect(page.getByRole('button', { name: 'Play your recording' }).first()).toBeEnabled();
	// Second take, left running.
	await record.click();
	await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible();

	await page.getByTestId('start-lesson').click();
	const micReleased = () =>
		page.evaluate(() => {
			const streams = (window as unknown as StreamLog).__fpStreams;
			return (
				streams.length > 0 &&
				streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended'))
			);
		});
	await expect.poll(micReleased).toBe(true);
});
