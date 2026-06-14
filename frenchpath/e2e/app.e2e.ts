import { test, expect, type Page } from '@playwright/test';

/** Opens the home path map, dismissing the first-run onboarding if shown. */
async function gotoHome(page: Page) {
	await page.goto('/');
	const start = page.getByTestId('onboarding-start');
	const unitCard = page.getByTestId('unit-card');
	await expect(start.or(unitCard).first()).toBeVisible();
	if (await start.count()) await start.click();
	await expect(unitCard.first()).toBeVisible();
}

/**
 * Answers each exercise in turn (correctness doesn't matter for the flow —
 * cards are seeded regardless) until the lesson summary appears.
 */
async function completeLesson(page: Page) {
	const summary = page.getByTestId('summary');
	const check = page.getByTestId('check');
	// Synchronise on observable UI: a question (check button) or the summary.
	await expect(check.or(summary).first()).toBeVisible();

	while (!(await summary.isVisible().catch(() => false))) {
		const cloze = page.locator('[data-testid="cloze-input"]:enabled');
		const text = page.locator('[data-testid="text-answer"]:enabled');
		const selects = page.locator('[data-testid="matching-select"]:enabled');
		const mcq = page.locator('[data-testid="mcq-option"]:enabled');
		const reorderWord = page.locator('[data-testid="reorder-word"]:enabled');
		const genderOption = page.locator('[data-testid="gender-option"]:enabled');

		// Wait for the (possibly just-remounted) exercise input to mount.
		await expect(
			cloze.or(text).or(selects).or(mcq).or(reorderWord).or(genderOption).first()
		).toBeVisible();

		if (await cloze.count()) {
			await cloze.fill('bonjour');
		} else if (await text.count()) {
			await text.fill('test');
		} else if (await selects.count()) {
			const count = await selects.count();
			for (let s = 0; s < count; s++) await selects.nth(s).selectOption({ index: 1 });
		} else if (await reorderWord.count()) {
			// Tap every word into the answer line (bank shrinks as words are placed).
			while ((await reorderWord.count()) > 0) await reorderWord.first().click();
		} else if (await genderOption.count()) {
			await genderOption.first().click();
		} else {
			await mcq.first().click();
		}

		await expect(check).toBeEnabled();
		await check.click();
		await page.getByTestId('continue').click();
		// Wait for the next question or the summary before looping.
		await expect(check.or(summary).first()).toBeVisible();
	}
}

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

	// Back to the path map, then a hard reload — progress comes from IndexedDB.
	await page.getByRole('link', { name: 'Back to path' }).click();
	await page.reload();
	await expect(page.getByTestId('unit-card').first()).toContainText('✓');
	// Retention loop: completing a lesson started the streak and earned XP.
	await expect(page.getByTestId('streak-badge')).toContainText('1');
	await expect(page.getByTestId('daily-goal')).toContainText('/ 30 XP');
});

test('completed lesson seeds the SRS queue and reviews can be graded', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);

	await page.getByRole('link', { name: 'Review now' }).click();

	const reveal = page.getByTestId('reveal');
	const done = page.getByTestId('review-done');
	await expect(reveal.or(done).first()).toBeVisible();

	while (!(await done.isVisible().catch(() => false))) {
		await reveal.click();
		await page.locator('[data-grade="good"]').click();
		// Wait for the next card's reveal button or the done screen.
		await expect(reveal.or(done).first()).toBeVisible();
	}
	await expect(done).toBeVisible();
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
	// Let the service worker install and take control.
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
			await submitSection.click(); // productive section: self-assessed
			continue;
		}

		// objective item — fill whichever input is shown, then check + continue
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

test('no CSP violations on the core routes', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error' && /content security policy/i.test(msg.text())) {
			violations.push(msg.text());
		}
	});
	for (const path of ['/', '/review', '/progress', '/settings']) {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
	}
	expect(violations).toEqual([]);
});

test('UI language toggle switches the interface to Hindi', async ({ page }) => {
	await gotoHome(page); // dismiss onboarding first
	await page.goto('/settings');
	await page.getByTestId('language-select').selectOption('hi');
	// setLocale persists the choice and reloads; the nav renders in Hindi.
	await expect(page.getByRole('navigation')).toContainText('सीखें');
});
