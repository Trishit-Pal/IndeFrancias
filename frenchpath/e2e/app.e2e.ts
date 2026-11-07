import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson, reviewUntilDone } from './helpers';

test('learner can complete the A1 lesson and see a score', async ({ page }) => {
	await gotoHome(page);
	await expect(page.getByRole('heading', { name: 'FrenchPath' })).toBeVisible();

	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);

	await expect(page.getByTestId('summary')).toBeVisible();
	await expect(page.getByText(/Lesson complete/)).toBeVisible();
});

test('progress persists across a reload (IndexedDB)', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);

	await page.getByRole('link', { name: 'Back to path' }).click();
	await page.reload();
	await expect(page.getByTestId('unit-card').first()).toContainText('✓');
	await expect(page.getByTestId('streak-badge')).toContainText('1');
	await expect(page.getByTestId('daily-goal')).toContainText('/ 50 XP');
	// B1–C1 are AI-drafted → surfaced as a quiet "beta" pill on the voyage map.
	await expect(page.locator('.fp-beta-badge').first()).toHaveText('Beta');
});

test('completed lesson seeds the SRS queue and reviews can be graded', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);

	await page.getByRole('link', { name: 'Review now' }).click();

	const done = page.getByTestId('review-done');
	await reviewUntilDone(page);
	await expect(done).toBeVisible();
});

test('double-clicking Continue grades the card exactly once and moves focus into the next card', async ({
	page
}) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Review now' }).click();

	const ctx = page.getByTestId('context-card');
	await expect(ctx.or(page.getByTestId('reveal')).first()).toBeVisible();
	const total = Number(
		(await page.getByText(/^\d+ \/ \d+ due$/).innerText()).match(/\/ (\d+)/)![1]
	);
	await expect(ctx).toBeVisible();
	await page.getByTestId('context-choice').first().click();
	// two synchronous clicks: a real dblclick can land after the first grade has already unmounted the card
	await page.getByTestId('continue').evaluate((el: HTMLElement) => {
		el.click();
		el.click();
	});
	await expect(page.getByTestId('continue')).toBeHidden();
	if (total > 1 && (await ctx.isVisible())) {
		// the answered card unmounted; focus must land inside the new card, not <body>
		await expect
			.poll(() =>
				page.evaluate(() => !!document.activeElement?.closest('[data-testid=context-card]'))
			)
			.toBe(true);
	}
	await reviewUntilDone(page);
	await expect(page.getByTestId('review-summary-cards')).toHaveText(`Cards reviewed: ${total}`);

	// a double grade also skips the next card, so row count alone can match: require one row per distinct card
	const cardIds = await page.evaluate(
		() =>
			new Promise<string[]>((resolve, reject) => {
				const open = indexedDB.open('frenchpath');
				open.onerror = () => reject(open.error);
				open.onsuccess = () => {
					const req = open.result.transaction('reviewLog').objectStore('reviewLog').getAll();
					req.onsuccess = () => resolve(req.result.map((r: { cardId: string }) => r.cardId));
					req.onerror = () => reject(req.error);
				};
			})
	);
	expect(cardIds).toHaveLength(total);
	expect(new Set(cardIds).size).toBe(total);
});

test('exposes an installable web manifest', async ({ page }) => {
	await gotoHome(page);
	const href = await page.getAttribute('link[rel="manifest"]', 'href');
	expect(href).toBeTruthy();

	const res = await page.request.get(href!);
	expect(res.ok()).toBeTruthy();
	const manifest = await res.json();
	expect(manifest.name).toContain('FrenchPath');
	expect(manifest.icons.length).toBeGreaterThan(0);
});

test('app shell still loads when offline', async ({ page, context }) => {
	await gotoHome(page);
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();

	await context.setOffline(true);
	await page.reload();

	await expect(page.getByRole('heading', { name: 'FrenchPath' })).toBeVisible();
	await expect(page.getByTestId('offline-banner')).toBeVisible();

	await context.setOffline(false);
});

test('mock DELF A2 runs through all sections and shows a scored result', async ({ page }) => {
	await page.goto('/exam/delf-a2');
	await page.getByTestId('start-exam').click();

	const result = page.getByTestId('exam-result');
	const examCheck = page.getByTestId('exam-check');
	const submitSection = page.getByTestId('exam-submit-section');

	for (let i = 0; i < 25; i++) {
		await expect(result.or(examCheck).or(submitSection).first()).toBeVisible();
		if (await result.isVisible().catch(() => false)) break;

		if (await submitSection.count()) {
			await submitSection.click();
			continue;
		}

		const text = page.getByTestId('text-answer');
		const mcq = page.getByTestId('mcq-option');
		const cloze = page.getByTestId('cloze-input');
		await expect(text.or(mcq).or(cloze).first()).toBeVisible();
		if (await text.count()) await text.first().fill('test');
		else if (await cloze.count()) await cloze.fill('test');
		else await mcq.first().click();

		await examCheck.click();
		await page.getByTestId('exam-continue').click();
	}

	await expect(result).toBeVisible();
	await expect(result).toContainText('/ 100');
});

test('no CSP violations on core and dynamic routes', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error' && /content security policy/i.test(msg.text())) {
			violations.push(msg.text());
		}
	});
	for (const path of [
		'/',
		'/review',
		'/progress',
		'/settings',
		'/learn/a1-unit-01',
		'/checkpoint/g1',
		'/exam/delf-a2',
		'/exam/delf-b1',
		'/exam/delf-b2',
		'/exam/dalf-c1'
	]) {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
	}
	expect(violations).toEqual([]);
});

test('UI language toggle switches the interface to Hindi', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	await page.getByTestId('language-select').selectOption('hi');
	await expect(page.getByRole('navigation')).toContainText('सीखें');
});

test('replaying a perfect lesson awards zero improvement XP', async ({ page }) => {
	// completeLesson answers by position, and Matching/Reorder shuffle with
	// Math.random — so the replay could out-score the first run (flaky). A
	// constant Math.random makes Fisher-Yates yield the same order every time,
	// so both runs score identically. Only those two shuffles use Math.random.
	await page.addInitScript(() => {
		Math.random = () => 0;
	});
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await expect(page.getByTestId('xp-awarded')).toBeVisible();

	await page.getByRole('link', { name: 'Back to path' }).click();
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);

	await expect(page.getByTestId('practice-note')).toContainText('no new XP');
});
