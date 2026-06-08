# Data-Safety, Security & Retention-Integrity Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden FrenchPath's data layer (safe backup/restore + migration framework), add a defense-in-depth CSP, and close the XP/streak farming loophole — security and database first, UX second.

**Architecture:** Validate-before-destroy backup import (Zod + SHA-256 checksum), a versioned backup-file migration registry, SvelteKit hash-mode CSP plus portable header files, and an improvement-delta XP rule that caps lifetime lesson XP at one full completion.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, `idb` (IndexedDB), `zod`, Web Crypto (`crypto.subtle`), Vitest + `fake-indexeddb`, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-08-data-safety-security-retention-hardening-design.md`

### Planning refinements vs spec
- `ProgressRecord.bestCorrect` is an **optional field with a lazy read-time fallback** (derived from the existing `score × total` on first post-upgrade completion). IndexedDB records are schemaless, so **no structural `upgrade()` migration is needed** to add it. `DB_VERSION` stays `1`.
- The **migration framework targets the backup *file* format** (`BACKUP_VERSION 1 → 2`), where cross-version actually bites (importing an old export into a new app). This is the concrete, tested proof of the framework.

### Conventions
- Run all commands from `frenchpath/` (the app root).
- After each task: `npm run test:unit -- --run` (green), then commit. Keep `npm run check` and `npm run lint` clean.
- Commit style: conventional commits, no attribution footer (per the user's global git config).

---

## Phase 1 — Data durability (security ∩ database)

### Task 1: SHA-256 checksum utility

**Files:**
- Create: `src/lib/pwa/checksum.ts`
- Test: `src/lib/pwa/checksum.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pwa/checksum.spec.ts
import { describe, it, expect } from 'vitest';
import { sha256Hex } from './checksum';

describe('sha256Hex', () => {
	it('produces the known SHA-256 hex digest of a string', async () => {
		// echo -n "abc" | sha256sum
		expect(await sha256Hex('abc')).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
	});

	it('is stable for the same input and differs for different input', async () => {
		expect(await sha256Hex('hello')).toBe(await sha256Hex('hello'));
		expect(await sha256Hex('hello')).not.toBe(await sha256Hex('hello!'));
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/lib/pwa/checksum.spec.ts`
Expected: FAIL — `sha256Hex` is not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/pwa/checksum.ts
// SHA-256 hex digest of a UTF-8 string via Web Crypto. Works in the browser
// and in Node (vitest) — both expose globalThis.crypto.subtle.
export async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/lib/pwa/checksum.spec.ts`
Expected: PASS. (If `crypto` is undefined in the test env, add `import { webcrypto } from 'node:crypto'` and `globalThis.crypto ??= webcrypto as Crypto` to `src/tests/setup.ts`.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pwa/checksum.ts src/lib/pwa/checksum.spec.ts
git commit -m "feat: add SHA-256 checksum util for backup integrity"
```

---

### Task 2: Backup payload + file Zod schemas

**Files:**
- Create: `src/lib/pwa/backupSchema.ts`
- Test: `src/lib/pwa/backupSchema.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pwa/backupSchema.spec.ts
import { describe, it, expect } from 'vitest';
import { backupPayloadSchema, backupFileSchema, CURRENT_BACKUP_VERSION } from './backupSchema';

const emptyPayload = {
	settings: null,
	progress: [],
	srsCards: [],
	reviewLog: [],
	streak: [],
	stats: [],
	skillProfile: []
};

describe('backupSchema', () => {
	it('accepts a well-formed empty payload', () => {
		expect(backupPayloadSchema.safeParse(emptyPayload).success).toBe(true);
	});

	it('rejects a payload with a malformed progress record', () => {
		const bad = { ...emptyPayload, progress: [{ lessonId: 'x' }] };
		expect(backupPayloadSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects a file whose schemaVersion is not the current one', () => {
		const file = { schemaVersion: 1, exportedAt: 'now', checksum: 'x', payload: emptyPayload };
		expect(backupFileSchema.safeParse(file).success).toBe(false);
		expect(CURRENT_BACKUP_VERSION).toBe(2);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/lib/pwa/backupSchema.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/pwa/backupSchema.ts
// Validates backup files at the import boundary. Dates are stored as ISO
// strings in the JSON payload and revived to Date objects on write.
import { z } from 'zod';

const cefr = z.enum(['A1', 'A2', 'B1', 'B2', 'C1']);
const skill = z.enum(['listening', 'reading', 'spokenInteraction', 'spokenProduction', 'writing']);

export const settingsSchema = z.object({
	uiLanguage: z.enum(['en', 'hi', 'hinglish']),
	targetRetention: z.number(),
	dailyGoalXp: z.number(),
	ttsVoice: z.string().nullable(),
	audioSpeed: z.number(),
	theme: z.enum(['light', 'dark', 'system']),
	reduceMotion: z.boolean(),
	persistGranted: z.boolean(),
	onboarded: z.boolean()
});

export const progressSchema = z.object({
	lessonId: z.string().min(1),
	status: z.enum(['locked', 'available', 'completed']),
	score: z.number(),
	attempts: z.number(),
	lastVisited: z.number(),
	cefrLevel: cefr,
	bestCorrect: z.number().optional()
});

export const srsCardSchema = z.object({
	cardId: z.string().min(1),
	contentId: z.string(),
	cefrLevel: cefr,
	skill,
	due: z.string(),
	stability: z.number(),
	difficulty: z.number(),
	elapsed_days: z.number(),
	scheduled_days: z.number(),
	learning_steps: z.number(),
	reps: z.number(),
	lapses: z.number(),
	state: z.number(),
	last_review: z.string().optional(),
	lastGrade: z.number().optional(),
	schedulerVersion: z.string()
});

export const reviewLogSchema = z.object({
	id: z.number().optional(),
	cardId: z.string(),
	ts: z.number(),
	grade: z.number(),
	state: z.number(),
	stability: z.number(),
	difficulty: z.number(),
	elapsedDays: z.number(),
	scheduledDays: z.number(),
	reviewDurationMs: z.number().optional()
});

export const streakSchema = z.object({
	id: z.literal('streak'),
	currentStreak: z.number(),
	longestStreak: z.number(),
	lastActiveDate: z.string(),
	freezesAvailable: z.number(),
	freezesUsed: z.number()
});

export const statsSchema = z.object({
	date: z.string(),
	xp: z.number(),
	minutes: z.number(),
	lessonsCompleted: z.number(),
	reviewsDone: z.number()
});

export const skillProfileSchema = z.object({
	skill,
	estimatedLevel: cefr,
	updatedAt: z.number()
});

// Key order here is the canonical order used to compute the checksum.
export const backupPayloadSchema = z.object({
	settings: settingsSchema.nullable(),
	progress: z.array(progressSchema),
	srsCards: z.array(srsCardSchema),
	reviewLog: z.array(reviewLogSchema),
	streak: z.array(streakSchema),
	stats: z.array(statsSchema),
	skillProfile: z.array(skillProfileSchema)
});
export type BackupPayload = z.infer<typeof backupPayloadSchema>;

export const CURRENT_BACKUP_VERSION = 2;

export const backupFileSchema = z.object({
	schemaVersion: z.literal(CURRENT_BACKUP_VERSION),
	exportedAt: z.string(),
	checksum: z.string(),
	payload: backupPayloadSchema
});
export type BackupFile = z.infer<typeof backupFileSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/lib/pwa/backupSchema.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pwa/backupSchema.ts src/lib/pwa/backupSchema.spec.ts
git commit -m "feat: add zod schemas validating backup files at the import boundary"
```

---

### Task 3: Backup-file migration registry (v1 → v2)

**Files:**
- Create: `src/lib/pwa/migrations.ts`
- Test: `src/lib/pwa/migrations.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pwa/migrations.spec.ts
import { describe, it, expect } from 'vitest';
import { migrateBackup } from './migrations';
import { backupFileSchema } from './backupSchema';

const legacyV1 = {
	version: 1,
	exportedAt: '2026-01-01T00:00:00.000Z',
	settings: null,
	progress: [],
	srsCards: [],
	reviewLog: [],
	streak: [],
	stats: [],
	skillProfile: []
};

describe('migrateBackup', () => {
	it('wraps a legacy v1 flat backup into a valid v2 file', async () => {
		const migrated = await migrateBackup(legacyV1);
		expect(backupFileSchema.safeParse(migrated).success).toBe(true);
	});

	it('passes a v2 file through unchanged', async () => {
		const v2 = { schemaVersion: 2, exportedAt: 'now', checksum: 'x', payload: {} };
		expect(await migrateBackup(v2)).toBe(v2);
	});

	it('throws a version error for an unknown version', async () => {
		await expect(migrateBackup({ version: 999 })).rejects.toThrow(/version/i);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/lib/pwa/migrations.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/pwa/migrations.ts
// Backup-file format migrations. Each step upgrades one version to the next;
// migrateBackup runs the chain up to CURRENT_BACKUP_VERSION. This is the single
// place the cross-version backup story lives — extend it when the format changes.
import { sha256Hex } from './checksum';
import { CURRENT_BACKUP_VERSION } from './backupSchema';

interface LegacyV1Backup {
	version: 1;
	exportedAt?: string;
	settings: unknown;
	progress: unknown[];
	srsCards: unknown[];
	reviewLog: unknown[];
	streak: unknown[];
	stats: unknown[];
	skillProfile: unknown[];
}

/** Reshapes the flat v1 backup into the v2 { schemaVersion, checksum, payload } wrapper. */
async function v1ToV2(old: LegacyV1Backup): Promise<unknown> {
	const payload = {
		settings: old.settings ?? null,
		progress: old.progress ?? [],
		srsCards: old.srsCards ?? [],
		reviewLog: old.reviewLog ?? [],
		streak: old.streak ?? [],
		stats: old.stats ?? [],
		skillProfile: old.skillProfile ?? []
	};
	return {
		schemaVersion: CURRENT_BACKUP_VERSION,
		exportedAt: old.exportedAt ?? '1970-01-01T00:00:00.000Z',
		checksum: await sha256Hex(JSON.stringify(payload)),
		payload
	};
}

/** Upgrades a parsed backup object to the current file version, or throws. */
export async function migrateBackup(
	raw: { version?: number; schemaVersion?: number } & Record<string, unknown>
): Promise<unknown> {
	const version = raw.schemaVersion ?? raw.version;
	if (version === CURRENT_BACKUP_VERSION) return raw;
	if (version === 1) return v1ToV2(raw as unknown as LegacyV1Backup);
	throw new Error(`Unsupported backup version: ${String(version)}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/lib/pwa/migrations.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pwa/migrations.ts src/lib/pwa/migrations.spec.ts
git commit -m "feat: add backup-file migration registry (v1->v2)"
```

---

### Task 4: Rewrite export/import — validate-before-destroy + checksum

**Files:**
- Modify: `src/lib/pwa/backup.ts` (full rewrite)
- Test: `src/lib/pwa/backup.spec.ts` (extend)

- [ ] **Step 1: Write the failing tests** (append inside the existing `describe` block)

```ts
	it('rejects a tampered checksum and leaves existing data intact', async () => {
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const json = await exportBackup();
		const file = JSON.parse(json);
		file.checksum = 'deadbeef'; // tamper
		await expect(importBackup(JSON.stringify(file))).rejects.toThrow(/checksum|integrity/i);
		// existing data must NOT have been cleared
		expect((await progressRepo.getProgress('keep'))?.score).toBe(80);
	});

	it('rejects a malformed record without clearing existing data', async () => {
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const json = await exportBackup();
		const file = JSON.parse(json);
		file.payload.progress = [{ lessonId: 5 }]; // wrong shape
		file.checksum = await (await import('./checksum')).sha256Hex(JSON.stringify(file.payload));
		await expect(importBackup(JSON.stringify(file))).rejects.toThrow(/invalid/i);
		expect((await progressRepo.getProgress('keep'))?.score).toBe(80);
	});

	it('restores a legacy v1 backup via migration', async () => {
		const legacy = {
			version: 1,
			exportedAt: '2026-01-01T00:00:00.000Z',
			settings: null,
			progress: [
				{ lessonId: 'old', status: 'completed', score: 70, attempts: 1, lastVisited: 1, cefrLevel: 'A1' }
			],
			srsCards: [],
			reviewLog: [],
			streak: [],
			stats: [],
			skillProfile: []
		};
		await importBackup(JSON.stringify(legacy));
		expect((await progressRepo.getProgress('old'))?.score).toBe(70);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --run src/lib/pwa/backup.spec.ts`
Expected: FAIL — old import has no checksum/validation behavior.

- [ ] **Step 3: Rewrite the implementation**

```ts
// src/lib/pwa/backup.ts
// Account-free backup: export/import all on-device data as a JSON file. Import
// VALIDATES before it destroys — a corrupt or malformed file can never reach the
// clear() step, so existing data survives any bad import.
import { getDB } from '../db';
import {
	SETTINGS_KEY,
	type Settings,
	type ProgressRecord,
	type SrsCard,
	type ReviewLogRecord,
	type StreakRecord,
	type DailyStats,
	type SkillProfileRecord
} from '../db/schema';
import { backupFileSchema, CURRENT_BACKUP_VERSION, type BackupPayload } from './backupSchema';
import { sha256Hex } from './checksum';
import { migrateBackup } from './migrations';

const STORES = [
	'settings',
	'progress',
	'srsCards',
	'reviewLog',
	'streak',
	'stats',
	'skillProfile'
] as const;

/** Serialises the whole database to a JSON string with an integrity checksum. */
export async function exportBackup(): Promise<string> {
	const db = await getDB();
	const payload = {
		settings: (await db.get('settings', SETTINGS_KEY)) ?? null,
		progress: await db.getAll('progress'),
		srsCards: await db.getAll('srsCards'),
		reviewLog: await db.getAll('reviewLog'),
		streak: await db.getAll('streak'),
		stats: await db.getAll('stats'),
		skillProfile: await db.getAll('skillProfile')
	};
	const file = {
		schemaVersion: CURRENT_BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		checksum: await sha256Hex(JSON.stringify(payload)),
		payload
	};
	return JSON.stringify(file, null, 2);
}

// JSON has no Date type, so SRS card dates come back as ISO strings on import.
function reviveCard(c: BackupPayload['srsCards'][number]): SrsCard {
	return {
		...c,
		due: new Date(c.due),
		last_review: c.last_review ? new Date(c.last_review) : undefined
	} as SrsCard;
}

/** Replaces all data with a previously exported backup, after full validation. */
export async function importBackup(json: string): Promise<void> {
	const raw = JSON.parse(json) as {
		version?: number;
		schemaVersion?: number;
		checksum?: string;
		payload?: unknown;
	};
	const version = raw.schemaVersion ?? raw.version;
	if (version !== 1 && version !== CURRENT_BACKUP_VERSION) {
		throw new Error(`Unsupported backup version: ${String(version)}`);
	}

	// For natively-v2 files, verify integrity over the RAW payload (stable key
	// order matches what exportBackup hashed). v1 files have no checksum to check.
	if (version === CURRENT_BACKUP_VERSION) {
		const expected = await sha256Hex(JSON.stringify(raw.payload ?? null));
		if (expected !== raw.checksum) {
			throw new Error('Backup integrity check failed: checksum mismatch (corrupted or edited file).');
		}
	}

	const migrated = await migrateBackup(raw);
	const parsed = backupFileSchema.safeParse(migrated);
	if (!parsed.success) {
		throw new Error(`Invalid backup file: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}`);
	}
	const p = parsed.data.payload;

	// Validation passed — only now mutate the database, atomically.
	const db = await getDB();
	const tx = db.transaction(STORES, 'readwrite');
	await Promise.all(STORES.map((store) => tx.objectStore(store).clear()));

	if (p.settings) await tx.objectStore('settings').put(p.settings as Settings, SETTINGS_KEY);
	for (const r of p.progress) await tx.objectStore('progress').put(r as ProgressRecord);
	for (const r of p.srsCards) await tx.objectStore('srsCards').put(reviveCard(r));
	for (const r of p.reviewLog) await tx.objectStore('reviewLog').put(r as ReviewLogRecord);
	for (const r of p.streak) await tx.objectStore('streak').put(r as StreakRecord);
	for (const r of p.stats) await tx.objectStore('stats').put(r as DailyStats);
	for (const r of p.skillProfile) await tx.objectStore('skillProfile').put(r as SkillProfileRecord);

	await tx.done;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --run src/lib/pwa/backup.spec.ts`
Expected: PASS — including the original round-trip and version-999 tests (version 999 → unsupported-version throw).

- [ ] **Step 5: Run the full suite + types**

Run: `npm run test:unit -- --run && npm run check`
Expected: all green, 0 type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pwa/backup.ts src/lib/pwa/backup.spec.ts
git commit -m "feat: validate-before-destroy backup import with checksum + version migration"
```

---

## Phase 2 — Defense-in-depth security headers

### Task 5: SvelteKit hash-mode CSP

**Files:**
- Modify: `svelte.config.js`

- [ ] **Step 1: Add the `csp` block to `kit`**

```js
// svelte.config.js — kit: { ... }
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'connect-src': ['self'],
				'img-src': ['self', 'data:'],
				'style-src': ['self', 'unsafe-inline'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-ancestors': ['none'],
				'manifest-src': ['self'],
				'worker-src': ['self']
			}
		}
```

(Insert as a sibling of `adapter` and `paths` inside the existing `kit: { ... }` object.)

- [ ] **Step 2: Build to verify CSP is emitted**

Run: `npm run build`
Expected: build succeeds; prerendered HTML in `build/` contains a `<meta http-equiv="content-security-policy" ...>` tag. (On OneDrive, if `EPERM` on `./build`, delete `build/` and retry.)

- [ ] **Step 3: Commit**

```bash
git add svelte.config.js
git commit -m "feat: add hash-mode Content-Security-Policy to the prerendered shell"
```

> **Verification note for Task 7:** if the service-worker registration script trips CSP, check the PWA register strategy in `vite.config.ts` (`@vite-pwa/sveltekit`). Prefer `injectRegister: 'auto'`/`'script'` (an external/SvelteKit-hashed script) over a raw inline string CSP can't hash. Resolve before merging.

---

### Task 6: Portable security-header files

**Files:**
- Create: `static/_headers` (Cloudflare Pages / Netlify)
- Create: `vercel.json` (Vercel; optional, documented)

- [ ] **Step 1: Create `static/_headers`**

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

(`adapter-static` copies `static/` to the build root, so `_headers` lands where Cloudflare Pages / Netlify read it.)

- [ ] **Step 2: Create `vercel.json`** (only used if deploying to Vercel)

```json
{
	"headers": [
		{
			"source": "/(.*)",
			"headers": [
				{ "key": "X-Content-Type-Options", "value": "nosniff" },
				{ "key": "Referrer-Policy", "value": "no-referrer" },
				{ "key": "Permissions-Policy", "value": "geolocation=(), camera=(), microphone=(), payment=(), usb=()" },
				{ "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
				{ "key": "Cross-Origin-Resource-Policy", "value": "same-origin" },
				{ "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
			]
		}
	]
}
```

- [ ] **Step 3: Verify `_headers` is copied into the build**

Run: `npm run build`
Expected: `build/_headers` exists.

- [ ] **Step 4: Commit**

```bash
git add static/_headers vercel.json
git commit -m "feat: add portable security headers for static hosts"
```

---

### Task 7: Playwright CSP-violation gate

**Files:**
- Modify: `e2e/app.e2e.ts` (add one test)

- [ ] **Step 1: Add the test**

```ts
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
```

- [ ] **Step 2: Run e2e to verify it passes**

Run: `npm run test:e2e`
Expected: PASS with zero violations. If a violation appears, resolve it (see the Task 5 verification note — usually the SW register script or an inline style) before continuing.

- [ ] **Step 3: Commit**

```bash
git add e2e/app.e2e.ts
git commit -m "test: assert zero CSP violations on core routes"
```

---

## Phase 3 — Retention-integrity XP / streak

### Task 8: Add `bestCorrect` to the progress record

**Files:**
- Modify: `src/lib/db/schema.ts` (`ProgressRecord`)

- [ ] **Step 1: Add the optional field**

In `ProgressRecord`, add below `score`:

```ts
	/** Best correct-answer count achieved (drives improvement-delta XP). */
	bestCorrect?: number;
```

- [ ] **Step 2: Verify types still compile**

Run: `npm run check`
Expected: 0 errors (field is optional, so existing writers stay valid).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat: add optional bestCorrect to ProgressRecord"
```

---

### Task 9: Improvement-delta XP + streak gating in `completeLesson`

**Files:**
- Modify: `src/lib/lesson/complete.ts`
- Test: `src/lib/lesson/complete.spec.ts` (extend)

- [ ] **Step 1: Write the failing tests** (append to the `describe('completeLesson', ...)` block)

```ts
	it('awards improvement-delta XP across replays and caps at one full completion', async () => {
		await completeLesson(unit, { correct: 1, total: 3, score: 33 }); // first: +10
		await completeLesson(unit, { correct: 3, total: 3, score: 100 }); // improve by 2: +20
		const stats = await statsRepo.getStats(todayKey());
		expect(stats.xp).toBe(30); // == total(3) * 10, the lifetime ceiling
		expect((await progressRepo.getProgress('a1-test'))?.bestCorrect).toBe(3);
	});

	it('grants 0 XP for a no-improvement replay', async () => {
		await completeLesson(unit, { correct: 2, total: 2, score: 100 }); // +20
		await completeLesson(unit, { correct: 1, total: 2, score: 50 }); // worse: +0
		expect((await statsRepo.getStats(todayKey())).xp).toBe(20);
	});

	it('does not advance the streak on a no-improvement replay', async () => {
		const day1 = new Date('2026-03-01T10:00:00');
		const day2 = new Date('2026-03-02T10:00:00');
		await completeLesson(unit, { correct: 2, total: 2, score: 100 }, { now: day1 });
		await completeLesson(unit, { correct: 1, total: 2, score: 50 }, { now: day2 });
		const streak = await streakRepo.getStreak();
		expect(streak.currentStreak).toBe(1);
		expect(streak.lastActiveDate).toBe(todayKey(day1)); // day2 replay did NOT count
	});

	it('advances the streak when a replay sets a new best', async () => {
		const day1 = new Date('2026-03-01T10:00:00');
		const day2 = new Date('2026-03-02T10:00:00');
		await completeLesson(unit, { correct: 1, total: 2, score: 50 }, { now: day1 });
		await completeLesson(unit, { correct: 2, total: 2, score: 100 }, { now: day2 });
		expect((await streakRepo.getStreak()).currentStreak).toBe(2);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --run src/lib/lesson/complete.spec.ts`
Expected: FAIL — current code always grants `correct*10` and always credits the streak; also `opts.now` isn't a parameter yet.

- [ ] **Step 3: Rewrite `completeLesson`**

```ts
// src/lib/lesson/complete.ts
import type { Unit } from '../content/schema';
import { progressRepo, srsRepo, statsRepo } from '../db';
import { createSrsCard } from '../srs/fsrs';
import { recordDailyActivity } from '../gamification/activity';
import { todayKey } from '../utils/date';

export interface LessonResult {
	correct: number;
	total: number;
	score: number;
}

/** What the lesson awarded — lets the UI show an honest result. */
export interface CompleteOutcome {
	goalXp: number;
	isNewBest: boolean;
	bestScore: number;
}

const XP_PER_CORRECT = 10;

/** Namespaced SRS card id so the same content card is unique per unit. */
export function srsCardId(unitId: string, contentId: string): string {
	return `${unitId}:${contentId}`;
}

/**
 * Records a completed lesson. Goal-XP and streak credit come ONLY from genuine
 * progress — the first completion or a new personal best — so replaying an
 * already-aced lesson cannot farm the daily goal or streak. Lifetime goal-XP
 * from a lesson is therefore capped at `total * XP_PER_CORRECT`.
 */
export async function completeLesson(
	unit: Unit,
	result: LessonResult,
	opts: { now?: Date } = {}
): Promise<CompleteOutcome> {
	const now = opts.now ?? new Date();
	const existing = await progressRepo.getProgress(unit.id);

	// Legacy records (pre-bestCorrect) fall back to a value derived from best score.
	const previousBest =
		existing?.bestCorrect ?? Math.round(((existing?.score ?? 0) / 100) * result.total);
	const newBest = Math.max(previousBest, result.correct);
	const goalXp = Math.max(0, result.correct - previousBest) * XP_PER_CORRECT;
	const bestScore = Math.max(result.score, existing?.score ?? 0);

	await progressRepo.putProgress({
		lessonId: unit.id,
		status: 'completed',
		score: bestScore,
		bestCorrect: newBest,
		attempts: (existing?.attempts ?? 0) + 1,
		lastVisited: now.getTime(),
		cefrLevel: unit.cefrLevel
	});

	const newCards = [];
	for (const card of unit.cards) {
		const cardId = srsCardId(unit.id, card.id);
		if (!(await srsRepo.hasCard(cardId))) {
			newCards.push(
				createSrsCard({
					cardId,
					contentId: card.id,
					cefrLevel: card.cefrLevel,
					skill: card.skills[0] ?? 'reading',
					now
				})
			);
		}
	}
	if (newCards.length > 0) await srsRepo.putCards(newCards);

	if (goalXp > 0) {
		await statsRepo.addStats(todayKey(now), { xp: goalXp, lessonsCompleted: 1 });
		await recordDailyActivity(now);
	} else {
		await statsRepo.addStats(todayKey(now), { lessonsCompleted: 1 });
	}

	return { goalXp, isNewBest: result.correct > previousBest, bestScore };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --run src/lib/lesson/complete.spec.ts`
Expected: PASS — including the three pre-existing tests (first-completion XP `20`, streak starts at `1`, best-score-kept-on-replay).

- [ ] **Step 5: Commit**

```bash
git add src/lib/lesson/complete.ts src/lib/lesson/complete.spec.ts
git commit -m "feat: improvement-delta XP + streak gating to stop lesson-replay farming"
```

---

### Task 10: Honest replay UI in the lesson route

**Files:**
- Modify: `src/routes/learn/[unitId]/+page.svelte`

- [ ] **Step 1: Capture the outcome in `advance()`**

Add the import and state near the other lesson state (around lines 9 / 24):

```ts
	import { completeLesson, type CompleteOutcome } from '$lib/lesson/complete';
```

```ts
	let outcome = $state<CompleteOutcome | null>(null);
```

Update the completion branch of `advance()`:

```ts
		} else {
			outcome = await completeLesson(unit, { correct: correctCount, total, score });
			await ensurePersistence();
			phase = 'finished';
		}
```

- [ ] **Step 2: Show an honest message in the `finished` view**

Replace the SRS-note line (`<p class="mt-1 text-sm text-slate-500">{m.lesson_srs_note()}</p>`) with:

```svelte
				{#if outcome && outcome.goalXp > 0}
					<p class="mt-1 text-sm font-medium text-green-700" data-testid="xp-awarded">
						{outcome.isNewBest ? 'New best!' : ''} +{outcome.goalXp} XP
					</p>
				{:else}
					<p class="mt-1 text-sm text-slate-500" data-testid="practice-note">
						Practice complete — no new XP (best: {outcome?.bestScore ?? score}%).
						<a class="text-blue-700 underline" href={resolve('/review')}>Review due cards</a> to keep your streak.
					</p>
				{/if}
				<p class="mt-1 text-sm text-slate-500">{m.lesson_srs_note()}</p>
```

- [ ] **Step 3: Verify types + build**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/learn/[unitId]/+page.svelte
git commit -m "feat: honest XP/practice result on the lesson summary screen"
```

---

### Task 11: Cover `activity.ts` (close the earlier coverage gap)

**Files:**
- Create: `src/lib/gamification/activity.spec.ts`

- [ ] **Step 1: Write the tests**

```ts
// src/lib/gamification/activity.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../db';
import * as statsRepo from '../db/repositories/stats';
import * as settingsRepo from '../db/repositories/settings';
import * as streakRepo from '../db/repositories/streak';
import { recordDailyActivity, dailyGoalProgress } from './activity';
import { todayKey } from '../utils/date';

beforeEach(async () => {
	await resetDatabase();
});

describe('recordDailyActivity', () => {
	it('advances the streak the first time it is called', async () => {
		await recordDailyActivity(new Date('2026-04-01T09:00:00'));
		expect((await streakRepo.getStreak()).currentStreak).toBe(1);
	});

	it('is idempotent within the same day', async () => {
		const now = new Date('2026-04-01T09:00:00');
		await recordDailyActivity(now);
		await recordDailyActivity(now);
		expect((await streakRepo.getStreak()).currentStreak).toBe(1);
	});
});

describe('dailyGoalProgress', () => {
	it('reports met=false below the goal and met=true at/above it', async () => {
		const now = new Date('2026-04-01T09:00:00');
		await settingsRepo.saveSettings({ dailyGoalXp: 30 });
		await statsRepo.addStats(todayKey(now), { xp: 20 });
		let goal = await dailyGoalProgress(now);
		expect(goal).toMatchObject({ xp: 20, goal: 30, met: false });
		await statsRepo.addStats(todayKey(now), { xp: 10 });
		goal = await dailyGoalProgress(now);
		expect(goal.met).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests + coverage**

Run: `npm run test:unit -- --run --coverage`
Expected: PASS; `gamification/activity.ts` coverage rises well above its prior ~60%.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gamification/activity.spec.ts
git commit -m "test: cover recordDailyActivity and dailyGoalProgress"
```

---

## Phase 4 — Persistent tooling (reusable in ~/.claude)

### Task 12: `offline-data-safety` skill

**Files:**
- Create: `~/.claude/skills/offline-data-safety/SKILL.md`

- [ ] **Step 1: Write the skill**

```markdown
---
name: offline-data-safety
description: Use when editing the data layer of an offline-first PWA — IndexedDB migrations, backup/restore, or CSP. Enforces validate-before-destroy, integrity checks, additive tested migrations, and a locked script-src.
---

# Offline Data Safety

Invariants for any change touching on-device storage, backup/restore, or CSP.

## IndexedDB migrations
- Adding an OPTIONAL field to a record needs NO version bump (stores are schemaless). Use a read-time fallback for legacy records.
- New object stores / indexes DO need a `DB_VERSION` bump + an additive `upgrade(db, oldVersion)` branch guarded by `if (oldVersion < N)`. Never drop or rename data in place without a migration that preserves it.
- Every migration gets a test that starts from the prior version's data and asserts no loss.

## Backup / restore (untrusted input boundary)
- VALIDATE BEFORE DESTROY: schema-validate (Zod) and verify the integrity checksum BEFORE clearing or writing any store. A bad file must leave existing data untouched.
- Wrap the write in a single transaction so it is atomic.
- Version the backup FILE format and migrate older versions up on import; never hard-fail equality.
- The checksum is corruption/tamper-evidence, not a signature (a local no-account app has no secret). Zod is the real validation control.

## CSP for static PWAs
- `script-src 'self'` (hash mode) — never relax this. `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`.
- `style-src` may keep `'unsafe-inline'` (Svelte scoped styles + inline style attributes can't be hashed) — documented, low-risk.
- Verify zero CSP violations on every route after any change (Playwright console check).

## Checklist before merge
- [ ] No untrusted input reaches the DB unvalidated.
- [ ] No destructive op runs before validation passes.
- [ ] Migrations are additive, version-bumped where structural, and tested.
- [ ] CSP script-src stays locked; routes show zero violations.
```

- [ ] **Step 2: Confirm discovery**

Run: `ls ~/.claude/skills/offline-data-safety/` (the file exists). It will surface in future sessions via the skill list.

---

### Task 13: `pwa-data-reviewer` sub-agent

**Files:**
- Create: `~/.claude/agents/pwa-data-reviewer.md`

- [ ] **Step 1: Write the sub-agent**

```markdown
---
name: pwa-data-reviewer
description: Reviews diffs touching IndexedDB schema/migrations, backup/restore, or CSP in offline-first PWAs against the offline-data-safety invariants. Use as the review gate after data-layer changes.
tools: Read, Grep, Glob, Bash
---

You review changes to an offline-first PWA's data layer. Apply the `offline-data-safety` invariants and report findings by severity (CRITICAL / HIGH / MEDIUM / LOW).

Check specifically:
1. **Backup import** — Is untrusted input schema-validated AND checksum-verified BEFORE any `clear()`/`put()`? Could a malformed file destroy existing data? Is the write atomic (single transaction)?
2. **Migrations** — Additive? Version-bumped when structural (new store/index)? Is there a test that migrates prior-version data without loss? Any field added that silently breaks old records?
3. **CSP** — Is `script-src` still `'self'` (no `unsafe-inline`/`unsafe-eval` on scripts)? Are `object-src`, `base-uri`, `frame-ancestors` locked? Is there a route-level CSP-violation check?
4. **XP/streak integrity** (if touched) — Can any reward be farmed by replay? Is the lifetime ceiling preserved?

Return: a findings list (file:line, severity, why, fix) and an overall verdict (APPROVE / CHANGES REQUESTED). Be concrete; cite the exact lines.
```

- [ ] **Step 2: Use it as the phase gate**

After Phases 1–3, dispatch `pwa-data-reviewer` over the branch diff (`git diff main...HEAD`). Address CRITICAL/HIGH findings before opening a PR.

---

## Final verification

- [ ] `npm run test:unit -- --run --coverage` — all green, coverage ≥ 80% (target: stays ~94%).
- [ ] `npm run check` — 0 type errors.
- [ ] `npm run lint` — clean.
- [ ] `npm run test:e2e` — green, including the CSP-violation test.
- [ ] `npm run build` — succeeds; `build/_headers` present and CSP meta tag emitted.
- [ ] `pwa-data-reviewer` verdict: APPROVE.

## Self-review (author checklist — completed)
- **Spec coverage:** ① backup validation+checksum (Tasks 1–4) and migration framework (Task 3); ② CSP (Task 5) + headers (Task 6) + verification (Task 7); ③ improvement-delta XP + streak gating (Tasks 8–10) + UI (Task 10); activity coverage gap (Task 11); skill + sub-agent (Tasks 12–13). All spec sections mapped.
- **Placeholders:** none — every code/test step is complete.
- **Type consistency:** `CompleteOutcome`, `BackupFile`/`BackupPayload`, `CURRENT_BACKUP_VERSION`, `sha256Hex`, `migrateBackup` names are consistent across tasks; `completeLesson` gains `opts.now` and a return type used by Task 10.
- **Deviation (documented):** `bestCorrect` via optional field + read-time fallback (no DB structural migration); framework proven by the backup-file v1→v2 migration. `DB_VERSION` stays 1.
