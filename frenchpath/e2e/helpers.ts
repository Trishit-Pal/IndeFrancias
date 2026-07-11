import { expect, type Page } from '@playwright/test';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildCheckpointPool, gateById } from '../src/lib/assessment/checkpoint.js';
import { unitSchema, type Unit } from '../src/lib/content/schema.js';
import type { DifficultyTier } from '../src/lib/db/schema.js';
import type { Exercise } from '../src/lib/content/schema.js';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..');

function loadUnitForE2e(unitId: string): Unit {
	const match = unitId.match(/^(a1|a2|b1|b2|c1)-unit-(\d{2})$/);
	if (!match) throw new Error(`Unknown unit id: ${unitId}`);
	const filePath = path.join(repoRoot, 'src/content/packs', match[1]!, `unit-${match[2]}.json`);
	return unitSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
}

/**
 * Default stub for asr.ts's e2e hook (see src/lib/speech/asr.ts) so generic
 * flows (completeLesson/completeCheckpoint) can get through 'speak'
 * exercises deterministically, without a real model download + WASM
 * inference. Only fills the key if a test hasn't already set its own value —
 * speak.e2e.ts registers a specific stub via its own addInitScript *before*
 * calling gotoHome, and initScripts run in registration order, so that one
 * wins and this default is a no-op for it.
 */
async function stubAsrDefault(page: Page) {
	await page.addInitScript(() => {
		if (!localStorage.getItem('fp-e2e-stub-asr')) {
			localStorage.setItem('fp-e2e-stub-asr', JSON.stringify([{ word: 'test', conf: 1 }]));
		}
	});
}

/** Opens the home path map, completing multi-step onboarding if shown. */
export async function gotoHome(page: Page) {
	await stubAsrDefault(page);
	await page.goto('/');
	await expect(
		page.getByTestId('onboarding-wizard').or(page.getByTestId('unit-card').first())
	).toBeVisible({ timeout: 15_000 });
	if (await page.getByTestId('onboarding-wizard').isVisible()) {
		await skipOnboardingViaIdb(page);
		await page.reload();
	}
	await expect(page.getByTestId('unit-card').first()).toBeVisible({ timeout: 15_000 });
}

/** Seed onboarded settings for stable E2E (UI wizard tested separately). */
export async function skipOnboardingViaIdb(page: Page) {
	await page.evaluate(async () => {
		const settings = {
			uiLanguage: 'en',
			targetRetention: 0.9,
			dailyGoalXp: 50,
			ttsVoice: null,
			audioSpeed: 1,
			theme: 'system',
			reduceMotion: true,
			persistGranted: false,
			onboarded: true,
			nativeLanguage: 'hi',
			learningGoal: 'general',
			targetExamDate: null,
			dailyGoalPreset: 'regular',
			showFrenchTips: true,
			celebrationLevel: 'minimal',
			syncEnabled: false,
			revisionNotifications: false,
			difficultyTier: 'easy'
		};

		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open('frenchpath', 2);
			req.onerror = () => reject(req.error);
			req.onupgradeneeded = () => {
				const database = req.result;
				if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings');
				if (!database.objectStoreNames.contains('progress')) {
					database.createObjectStore('progress', { keyPath: 'lessonId' });
				}
				if (!database.objectStoreNames.contains('assessments')) {
					database.createObjectStore('assessments', { keyPath: 'assessmentId' });
				}
			};
			req.onsuccess = () => resolve(req.result);
		});

		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction('settings', 'readwrite');
			tx.objectStore('settings').put(settings, 'app');
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => reject(tx.error);
		});
	});

	await page.waitForFunction(async () => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open('frenchpath', 2);
			req.onerror = () => reject(req.error);
			req.onsuccess = () => resolve(req.result);
		});
		const onboarded = await new Promise<boolean>((resolve, reject) => {
			const tx = db.transaction('settings', 'readonly');
			const get = tx.objectStore('settings').get('app');
			get.onsuccess = () => {
				db.close();
				resolve(get.result?.onboarded === true);
			};
			get.onerror = () => reject(get.error);
		});
		return onboarded;
	});
}

/** Drive the v2+ onboarding wizard through all steps. */
export async function completeOnboarding(page: Page) {
	const wizard = page.getByTestId('onboarding-wizard');
	const cont = () => wizard.getByRole('button', { name: /^Continue$|^आगे$/ });

	await cont().click();
	await expect(wizard.getByTestId('native-lang-hi')).toBeVisible();
	await cont().click();
	await expect(wizard.getByTestId('goal-general')).toBeVisible();
	await cont().click();
	await expect(wizard.getByTestId('tier-regular')).toBeVisible();
	await wizard.getByTestId('tier-regular').click();
	await cont().click();
	await expect(wizard.getByTestId('preset-regular')).toBeVisible();
	await wizard.getByTestId('preset-regular').click();
	await cont().click();
	await expect(wizard.getByText(/Your data stays yours|आपका डेटा/i)).toBeVisible();
	await cont().click();
	await expect(wizard.getByTestId('onboarding-start')).toBeVisible();
	await wizard.getByTestId('onboarding-start').click();
	await expect(page.getByTestId('onboarding-wizard')).not.toBeVisible({ timeout: 15_000 });
	await expect(page.getByTestId('path-scene')).toBeVisible({ timeout: 15_000 });
}

/**
 * Answers each exercise in turn until the lesson summary appears.
 * Correctness doesn't matter for flow — cards are seeded regardless.
 */
export async function completeLesson(page: Page) {
	const summary = page.getByTestId('summary');
	const check = page.getByTestId('check');
	const bridgeContinue = page.getByTestId('bridge-quiz-continue');
	await expect(check.or(summary).or(bridgeContinue).first()).toBeVisible();

	while (!(await summary.isVisible().catch(() => false))) {
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

		const cloze = page.locator('[data-testid="cloze-input"]:enabled');
		const text = page.locator('[data-testid="text-answer"]:enabled');
		const selects = page.locator('[data-testid="matching-select"]:enabled');
		const mcq = page.locator('[data-testid="mcq-option"]:enabled');
		const reorderWord = page.locator('[data-testid="reorder-word"]:enabled');
		const genderOption = page.locator('[data-testid="gender-option"]:enabled');
		const speakRecord = page.locator('[data-testid="speak-record"]:enabled');

		await expect(
			cloze.or(text).or(selects).or(mcq).or(reorderWord).or(genderOption).or(speakRecord).first()
		).toBeVisible();

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
		} else if (await speakRecord.count()) {
			await recordAndStop(page);
		} else {
			await mcq.first().click();
		}

		await expect(check).toBeEnabled();
		await check.click();
		await page.getByTestId('continue').click();

		const confidence = page.getByTestId('confidence-pulse');
		if (await confidence.isVisible().catch(() => false)) {
			await page.getByTestId('confidence-ok').click();
		}

		await expect(check.or(summary).or(bridgeContinue).first()).toBeVisible();
	}

	const dismiss = page.getByTestId('celebration-skip');
	if (await dismiss.isVisible().catch(() => false)) {
		await dismiss.click();
	}
}

/** Click the speak-record toggle to start, wait for it to actually start
 * (avoids racing the async getUserMedia() call), then click again to stop
 * and trigger the stubbed transcription. */
async function recordAndStop(page: Page) {
	const recordBtn = page.getByTestId('speak-record');
	await recordBtn.click();
	await expect(recordBtn).toHaveAttribute('aria-pressed', 'true');
	await recordBtn.click();
}

/** Dismiss gloss popover if open. */
async function dismissGlossPopover(page: Page) {
	for (let i = 0; i < 3; i++) {
		await page.keyboard.press('Escape');
		const backdrop = page.locator('.fixed.inset-0.z-40');
		if ((await backdrop.count()) === 0) break;
		await backdrop
			.first()
			.click({ force: true, timeout: 500 })
			.catch(() => {});
	}
}

/** Apply the canonical answer for a known exercise (checkpoint E2E). */
async function applyExerciseAnswer(page: Page, ex: Exercise) {
	await dismissGlossPopover(page);

	switch (ex.type) {
		case 'mcq':
			await page.locator('[data-testid="mcq-option"]').nth(ex.answerIndex).click({ force: true });
			break;
		case 'gender': {
			const art =
				ex.answer === 'feminine'
					? ex.articleStyle === 'definite'
						? 'la'
						: 'une'
					: ex.articleStyle === 'definite'
						? 'le'
						: 'un';
			await page
				.locator('[data-testid="gender-option"]')
				.filter({ hasText: new RegExp(`^${art} `) })
				.first()
				.click({ force: true });
			break;
		}
		case 'cloze':
			await page.locator('[data-testid="cloze-input"]').fill(ex.answer);
			break;
		case 'dictation':
			await page.getByTestId('dictation-play').click();
			await page.locator('[data-testid="text-answer"]').fill(ex.answer);
			break;
		case 'translation':
		case 'conjugation':
		case 'listening':
			await page.locator('[data-testid="text-answer"]').fill(ex.answer);
			break;
		case 'reorder':
			for (const word of ex.words) {
				await page
					.locator('[data-testid="reorder-word"]')
					.filter({ hasText: word })
					.first()
					.click();
			}
			break;
		case 'matching': {
			const selects = page.locator('[data-testid="matching-select"]');
			for (let i = 0; i < ex.pairs.length; i++) {
				await selects.nth(i).selectOption({ value: ex.pairs[i]!.right });
			}
			break;
		}
		case 'reading':
			for (let q = 0; q < ex.questions.length; q++) {
				await page
					.locator('[data-testid="reading-option"]')
					.nth(ex.questions[q]!.answerIndex)
					.click();
			}
			break;
		case 'productive': {
			const boxes = page.locator('input[type="checkbox"]');
			const count = await boxes.count();
			for (let i = 0; i < Math.min(count, ex.minChecks); i++) {
				await boxes.nth(i).check();
			}
			break;
		}
		case 'speak':
			await recordAndStop(page);
			break;
	}
}

/** Answers checkpoint exercises until the result screen appears. */
export async function completeCheckpoint(page: Page, gateId = 'g1', tier: DifficultyTier = 'easy') {
	const gate = gateById(gateId);
	if (!gate) throw new Error(`Unknown gate: ${gateId}`);

	const units = gate.unitIds.map((id) => loadUnitForE2e(id));
	const exercises = buildCheckpointPool(units, tier, gateId);

	await page.getByTestId('checkpoint-start').click();
	const result = page.getByText(/Checkpoint passed|Not yet/);
	const check = page.getByTestId('checkpoint-check');

	for (const ex of exercises) {
		await expect(check.or(result).first()).toBeVisible();
		if (await result.isVisible().catch(() => false)) break;

		await applyExerciseAnswer(page, ex);
		await dismissGlossPopover(page);
		await expect(check).toBeEnabled();
		await check.click({ force: true });
		const cont = page.getByTestId('checkpoint-continue');
		await expect(cont).toBeVisible();
		await cont.click();
	}

	await expect(result).toBeVisible();

	const dismiss = page.getByTestId('celebration-skip');
	if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
}

/** Export backup JSON via settings UI and return parsed content. */
export async function exportBackupViaSettings(page: Page): Promise<string> {
	await page.goto('/settings');
	const downloadPromise = page.waitForEvent('download');
	await page.getByTestId('backup-export').click();
	const download = await downloadPromise;
	const filePath = await download.path();
	if (!filePath) throw new Error('Download path missing');
	return await import('node:fs/promises').then((fs) => fs.readFile(filePath, 'utf8'));
}

/** Import a backup file through the settings file picker. */
export async function importBackupFile(page: Page, json: string, confirm = true) {
	if (!page.url().includes('/settings')) {
		await page.goto('/settings');
	}
	const fileInput = page.getByTestId('backup-file-input');
	await fileInput.setInputFiles({
		name: 'backup.json',
		mimeType: 'application/json',
		buffer: Buffer.from(json)
	});
	if (confirm) {
		await expect(page.getByTestId('import-preview')).toBeVisible();
		await Promise.all([page.waitForEvent('load'), page.getByTestId('import-confirm').click()]);
	}
}

export function fixturePath(name: string): string {
	return path.join(import.meta.dirname, 'fixtures', name);
}
