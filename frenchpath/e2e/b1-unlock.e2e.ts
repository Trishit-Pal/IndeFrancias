import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

test('B1 band appears after milestone B1 is passed', async ({ page }) => {
	await gotoHome(page);
	await page.evaluate(async () => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open('frenchpath', 2);
			req.onerror = () => reject(req.error);
			req.onsuccess = () => resolve(req.result);
		});
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction('assessments', 'readwrite');
			tx.objectStore('assessments').put({
				assessmentId: 'milestone:B1',
				kind: 'cefr_milestone',
				refId: 'B1',
				score: 100,
				xpAwarded: 50,
				completedAt: Date.now()
			});
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => reject(tx.error);
		});
	});
	await page.reload();
	await expect(page.getByText('B1', { exact: true }).first()).toBeVisible();
	await expect(page.getByTestId('delf-b1-card')).toBeVisible();
});
