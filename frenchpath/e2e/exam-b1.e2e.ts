import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

test('DELF B1 mock exam loads intro without CSP errors', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error' && /content security policy/i.test(msg.text())) {
			violations.push(msg.text());
		}
	});

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

	await page.goto('/exam/delf-b1');
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('start-exam')).toBeVisible();
	expect(violations).toEqual([]);
});
