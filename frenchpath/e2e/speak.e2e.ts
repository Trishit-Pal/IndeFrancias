import { test, expect, type Page } from '@playwright/test';
import { gotoHome } from './helpers';

/**
 * Drives a1-unit-01 from the unit card through the bridge quiz and every
 * leading exercise (mcq/cloze/matching/gender/reorder/translation),
 * stopping once the seeded speak exercise (last in the unit) is on screen.
 * Mirrors the bridge-quiz loop in hints.e2e.ts's reachExercisePhase and the
 * generic answer-any-exercise loop in helpers.ts's completeLesson.
 */
async function reachSpeakExercise(page: Page) {
	const start = page.getByTestId('start-lesson');
	const bridgeContinue = page.getByTestId('bridge-quiz-continue');
	const speak = page.getByTestId('speak-exercise');
	const check = page.getByTestId('check');

	for (let attempt = 0; attempt < 20; attempt++) {
		if (await speak.isVisible().catch(() => false)) return;

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

		if (await start.isVisible().catch(() => false)) {
			await start.click();
			continue;
		}

		const cloze = page.locator('[data-testid="cloze-input"]:enabled');
		const text = page.locator('[data-testid="text-answer"]:enabled');
		const selects = page.locator('[data-testid="matching-select"]:enabled');
		const mcq = page.locator('[data-testid="mcq-option"]:enabled');
		const reorderWord = page.locator('[data-testid="reorder-word"]:enabled');
		const genderOption = page.locator('[data-testid="gender-option"]:enabled');

		if (await cloze.count()) {
			await cloze.fill('bonjour');
		} else if (await text.count()) {
			await text.fill('test');
		} else if (await selects.count()) {
			const count = await selects.count();
			for (let s = 0; s < count; s++) await selects.nth(s).selectOption({ index: 1 });
		} else if (await reorderWord.count()) {
			while ((await reorderWord.count()) > 0) await reorderWord.first().click();
		} else if (await genderOption.count()) {
			await genderOption.first().click();
		} else if (await mcq.count()) {
			await mcq.first().click();
		} else {
			continue;
		}

		await expect(check).toBeEnabled();
		await check.click();
		await page.getByTestId('continue').click();

		const confidence = page.getByTestId('confidence-pulse');
		if (await confidence.isVisible().catch(() => false)) {
			await page.getByTestId('confidence-ok').click();
		}
	}

	await expect(speak).toBeVisible({ timeout: 15_000 });
}

test('speak exercise scores per word with stubbed ASR', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'fp-e2e-stub-asr',
			JSON.stringify([
				{ word: 'je', conf: 1 },
				{ word: 'voudrais', conf: 0.5 },
				{ word: 'café', conf: 1 }
			])
		);
	});

	await page.addInitScript(() => {
		// Count getUserMedia calls and widen the async window so a double-tap
		// lands while the first call is still pending (the regression race).
		const md = navigator.mediaDevices;
		const orig = md.getUserMedia.bind(md);
		(window as unknown as { __gumCalls: number }).__gumCalls = 0;
		md.getUserMedia = async (constraints?: MediaStreamConstraints) => {
			(window as unknown as { __gumCalls: number }).__gumCalls += 1;
			await new Promise((r) => setTimeout(r, 300));
			return orig(constraints);
		};
	});

	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await reachSpeakExercise(page);

	await expect(page.getByTestId('speak-exercise')).toBeVisible();
	const recordBtn = page.getByTestId('speak-record');
	// Regression (M2.6 review): a rapid double-tap during the pending
	// getUserMedia() must not acquire a second, leaked mic stream.
	await recordBtn.click(); // start (getUserMedia pending ~300ms)
	await recordBtn.click(); // must be ignored, not treated as a second start
	await expect(recordBtn).toHaveAttribute('aria-pressed', 'true'); // wait for the async start to land
	expect(await page.evaluate(() => (window as unknown as { __gumCalls: number }).__gumCalls)).toBe(
		1
	);
	await recordBtn.click(); // stop → transcribe (stub returns instantly)

	const chips = page.getByTestId('speak-word-chip');
	await expect(chips).toHaveCount(4); // je voudrais un café
	await expect(chips.nth(2)).toHaveAttribute('data-verdict', 'missed'); // 'un'

	await page.getByTestId('check').click();
	await expect(page.getByTestId('feedback')).toBeVisible();
});
