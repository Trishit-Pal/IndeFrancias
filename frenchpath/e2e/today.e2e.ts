import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson, reviewUntilDone } from './helpers';

test('Today card links to a focused review after a lesson', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);

	await page.goto('/progress');
	await expect(page.getByTestId('today-card')).toBeVisible();
	await page.getByTestId('today-start').click();
	await expect(page).toHaveURL(/\/review\?mode=(read|listen|type|speak)$/);
	await reviewUntilDone(page);
});

test('Today card shows rest copy when nothing is due and the goal is met', async ({ page }) => {
	await gotoHome(page);
	await page.evaluate(async () => {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open('frenchpath', 2);
			req.onerror = () => reject(req.error);
			req.onsuccess = () => resolve(req.result);
		});
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction('stats', 'readwrite');
			tx.objectStore('stats').put({
				date,
				xp: 9999,
				minutes: 0,
				lessonsCompleted: 0,
				reviewsDone: 0
			});
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => reject(tx.error);
		});
	});
	await page.goto('/progress');
	await expect(page.getByTestId('today-card')).toBeVisible();
	await expect(page.getByTestId('today-start')).toHaveCount(0);
	await expect(page.getByTestId('today-card')).toContainText(
		"Today's goal is met and nothing is due. Enjoy your rest."
	);
});
