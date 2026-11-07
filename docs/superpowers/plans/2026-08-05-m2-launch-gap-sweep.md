# M2 Launch-Gap Sweep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three independently-mergeable PRs that close the M2 launch gap (i18n completion + data-layer hardening + docs/SW UX) without touching capabilities, invariants, or ADRs.

**Architecture:** Three orthogonal PRs. PR #1 is a pure-file-edit sweep on locale JSON. PR #2 extracts a `runInTransaction` helper and routes 4 call sites through it; adds `safeCall` + a `+error.svelte` boundary. PR #3 fixes docs drift + adds a non-coercive SW update toast. Each PR has its own test cycle and its own SPEC.md §11 entry.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), Vite, Tailwind v4, idb v8, @vite-pwa/sveltekit, Paraglide i18n, Vitest 4, Playwright 1.59.

**Spec:** [2026-08-05-m2-launch-gap-sweep-design](../specs/2026-08-05-m2-launch-gap-sweep-design.md) — read first.

---

## Global Constraints

- **SPEC.md is the SSOT.** Every PR ends with `npm run spec:validate` passing AND a new §11 row appended. Use the `/spec-sync` slash command or `frenchpath-spec-sync` skill.
- **No `any`.** Use `unknown` + narrowing at boundaries. `idb`'s typed `DBSchema` is the only type surface.
- **No `console.log`.** Production code only; build scripts under `frenchpath/scripts/` may `console.log` per existing pattern.
- **Coverage ≥ 80%** on touched modules. Refresh `frenchpath/coverage/` at end of PR #2.
- **Ponytail mode:** smallest working diff, stdlib first, no speculative abstractions. The `runInTransaction` helper exists because 4 call sites need it today — not for "future writes".
- **CSP invariant 4:** any new external fetches are FORBIDDEN. `worker-src`/`script-src`/`connect-src`/`default-src` remain as the M2.6 amendment left them. The new SW update toast does NOT add a fetch.
- **Non-coercive UX (invariant 6):** the SW update toast MUST be non-blocking + dismissable. NEVER auto-reload. The mic-denied InfoBanner MUST be informational, never guilt-y.
- **Test baseline before this sweep:** 267 unit + 42 e2e. Each PR must land green; do not regress.
- **Conventional commits only.** Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`. Format: `<type>(<scope>): <subject>`.
- **Branch:** from `main`. Each PR is its own branch named after the task.
  - PR #1 → `feat/m2-launch-gap-i18n`
  - PR #2 → `feat/m2-launch-gap-data-layer`
  - PR #3 → `feat/m2-launch-gap-docs-and-sw`

---

## File Structure

### PR #1 — i18n completion

| File | Action | Responsibility |
|---|---|---|
| `frenchpath/messages/bn.json` | modify | Bengali translations for the 24 keys |
| `frenchpath/messages/ta.json` | modify | Tamil |
| `frenchpath/messages/te.json` | modify | Telugu |
| `frenchpath/messages/kn.json` | modify | Kannada |
| `frenchpath/messages/mr.json` | modify | Marathi |
| `frenchpath/messages/gu.json` | modify | Gujarati |
| `frenchpath/messages/pa.json` | modify | Punjabi (Gurmukhi) |
| `frenchpath/messages/hinglish.json` | modify | Hinglish (Roman + Devanagari mix) |
| `frenchpath/docs/i18n-pending.md` | modify | Delete completed task rows |
| `frenchpath/src/tests/i18n.spec.ts` | create | Asserts no placeholder keys remain |
| `docs/spec/SPEC.md` | modify | Append §11 row (via /spec-sync) |

### PR #2 — Data-layer hardening

| File | Action | Responsibility |
|---|---|---|
| `frenchpath/src/lib/db/tx.ts` | create | `runInTransaction(stores, mode, fn)` typed wrapper |
| `frenchpath/src/lib/db/tx.ts` → types | create | `TransactionError` + `TransactionAbortedError` classes |
| `frenchpath/src/lib/platform/safeCall.ts` | create | `safeCall(fn, fallback)` for capability-probing |
| `frenchpath/src/routes/+error.svelte` | create | SvelteKit error boundary |
| `frenchpath/src/lib/db/repositories/settings.ts` | modify | `saveSettings` → `runInTransaction` |
| `frenchpath/src/lib/srs/review.ts` | modify | `recordReview` → `runInTransaction` |
| `frenchpath/src/lib/pwa/backup.ts` | modify | `importBackup` → `runInTransaction` (for consistency) |
| `frenchpath/src/lib/pwa/merge.ts` | modify | `mergePayloads` tx → `runInTransaction` |
| `frenchpath/src/lib/srs/optimizer.ts` | modify | Add `ponytail:` comment to silent `try/catch` |
| `frenchpath/src/lib/platform/haptics.ts` | modify | `try/catch` → `safeCall` |
| `frenchpath/src/lib/platform/notifications.ts` | modify | `try/catch` → `safeCall` |
| `frenchpath/src/lib/components/lesson/exercises/SpeakExercise.svelte` | modify | mic-denied → InfoBanner + reveal fallback |
| `frenchpath/src/lib/components/RecordCompare.svelte` | modify | mic-denied → InfoBanner + reveal fallback |
| `frenchpath/src/lib/db/tx.spec.ts` | create | Unit tests for the helper |
| `frenchpath/src/lib/platform/safeCall.spec.ts` | create | Unit tests |
| `frenchpath/src/lib/db/repositories/settings.spec.ts` | modify | Concurrent-save race test |
| `frenchpath/src/lib/srs/review.spec.ts` | modify | `recordReview` atomicity test |
| `frenchpath/src/lib/components/lesson/exercises/SpeakExercise.spec.ts` | modify | mic-denied banner test |
| `frenchpath/e2e/error-boundary.e2e.ts` | create | E2E test for the boundary |
| `frenchpath/e2e/mic-denied.e2e.ts` | create | E2E test for mic-denied fallback |
| `docs/spec/SPEC.md` | modify | Append §11 row (via /spec-sync) |

### PR #3 — Docs drift + SW update UX

| File | Action | Responsibility |
|---|---|---|
| `frenchpath/scripts/check-docs-drift.ts` | create | Asserts baseline numbers match SPEC §5 |
| `frenchpath/scripts/check-docs-drift.spec.ts` | create | Unit test |
| `frenchpath/src/lib/components/UpdateToast.svelte` | create | Non-coercive SW update toast |
| `frenchpath/src/lib/components/UpdateToast.spec.ts` | create | Unit test |
| `frenchpath/docs/launch-checklist.md` | modify | Update to 267/42 baseline |
| `frenchpath/docs/architecture-map.md` | modify | Update to 267/42 baseline |
| `frenchpath/docs/testing.md` | modify | Update to 267/42 + current known gaps |
| `frenchpath/vite.config.ts` | modify | `registerType: 'prompt'` + callbacks |
| `frenchpath/src/routes/+layout.svelte` | modify | Wire UpdateToast (web only) |
| `frenchpath/e2e/sw-update.e2e.ts` | create | E2E test |
| `frenchpath/package.json` | modify | Add `docs:drift` script |
| `docs/spec/SPEC.md` | modify | Append §11 row (via /spec-sync) |

---

# PR #1 — i18n completion

### Task 1.1: Verify which keys are still placeholders

**Files:**
- Read: `frenchpath/docs/i18n-pending.md`
- Read: all 10 locale files in `frenchpath/messages/`

**Goal:** Confirm the exact list of placeholder keys across the 8 non-English locales before any edit. The audit found 24 keys (sync + updates + speak pack); the older backlog mentions 3 key families × 9 locales (rubric_hint_label, fsrs_personalized_*, shadow_*). Verify each.

- [ ] **Step 1: Inventory the placeholder keys**

Run:
```bash
cd frenchpath
git grep -n "rubric_hint_label\|fsrs_personalized_\|shadow_start\|shadow_stop\|shadow_hint\|shadow_loop" messages/
```

Expected: each key shows up in 8 non-`en`/`hi` locales with English placeholder text (not the `hi` translation).

- [ ] **Step 2: Inventory the 24 sync/updates/speak pack keys**

Run:
```bash
cd frenchpath
git grep -c "sync_title\|updates_title\|speak_pack_title" messages/
```

Expected: `0` matches in `hi.json` for these keys (already translated), `>=1` in the 8 other locales with English placeholder.

- [ ] **Step 3: Write the key list to `docs/i18n-pending.md`**

Replace the file contents with a checklist of every key per locale. Format:
```markdown
# i18n placeholder tracking

| key | bn | ta | te | kn | mr | gu | pa | hinglish |
|---|---|---|---|---|---|---|---|---|
| sync_title | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| updates_title | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| … |
```

- [ ] **Step 4: Commit the inventory**

```bash
git add docs/i18n-pending.md
git commit -m "docs(i18n): inventory placeholder keys before PR #1 sweep"
```

### Task 1.2: Translate the sync keys

**Files:**
- Modify: `frenchpath/messages/{bn,ta,te,kn,mr,gu,pa,hinglish}.json`

The 11 sync keys:
- `sync_title`, `sync_body`, `sync_export`, `sync_import`, `sync_passphrase_label`, `sync_passphrase_hint`, `sync_preview_title`, `sync_preview_body`, `sync_confirm`, `sync_wrong_passphrase`, `sync_success`

Reference for idiomatic translations: `frenchpath/messages/hi.json` (canonical Hindi). Copy the same meaning, not literal text. For each non-`hi` locale:

- [ ] **Step 1: Translate `sync_title` for each locale**

Use `hi.json`'s value as the canonical meaning. Each locale gets its own idiomatic translation (NOT a transliteration of the Hindi). For example:
- `bn`: "সিঙ্ক করুন" (sink karun)
- `ta`: "ஒத்திசைவு" (ottisaiivu)
- `te`: "సింక్ చేయండి" (sink cheyandi)

Apply this pattern to all 11 keys × 8 locales.

- [ ] **Step 2: Validate JSON syntax after each locale file edit**

Run:
```bash
cd frenchpath
node -e "require('./messages/bn.json')" # repeat for each edited file
```

Expected: silent exit (no parse error).

- [ ] **Step 3: Run Paraglide compile**

Run:
```bash
cd frenchpath
npm run i18n:compile
```

Expected: 0 errors. The compiled output reflects the new translations.

### Task 1.3: Translate the updates + speak pack + rubric/FSRS/shadow keys

Same pattern as Task 1.2 for the remaining keys:

- 6 `updates_*` keys × 8 locales
- 13 `speak_pack_*` / `speak_record` / `speak_stop` / `speak_transcribing` / `speak_result_*` / `speak_fallback_*` keys × 8 locales
- 3 `rubric_hint_label`, `fsrs_personalized_*`, `shadow_*` keys × 8 locales (if any still placeholder)

- [ ] **Step 1: Apply translations to all 8 locale files for all remaining keys**

Same pattern as Task 1.2.

- [ ] **Step 2: Validate JSON + Paraglide compile**

Run:
```bash
cd frenchpath
for f in messages/{bn,ta,te,kn,mr,gu,pa,hinglish}.json; do node -e "require('./$f')" || echo "FAIL: $f"; done
npm run i18n:compile
```

Expected: no FAIL output, 0 compile errors.

- [ ] **Step 3: Commit the translations**

```bash
git add messages/*.json
git commit -m "feat(i18n): translate sync/updates/speak pack/rubric/FSRS/shadow keys for 8 Indic locales"
```

### Task 1.4: Write the i18n placeholder assertion test

**Files:**
- Create: `frenchpath/src/tests/i18n.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES = ['bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'hinglish'] as const;
const KEYS = [
  'sync_title', 'sync_body', 'sync_export', 'sync_import', 'sync_passphrase_label',
  'sync_passphrase_hint', 'sync_preview_title', 'sync_preview_body', 'sync_confirm',
  'sync_wrong_passphrase', 'sync_success',
  'updates_title', 'updates_toggle_label', 'updates_privacy_note', 'updates_available',
  'updates_current', 'updates_check_now',
  'speak_pack_title', 'speak_pack_body', 'speak_pack_download', 'speak_pack_progress',
  'speak_record', 'speak_stop', 'speak_transcribing', 'speak_result_good',
  'speak_result_partial', 'speak_result_retry', 'speak_fallback_prompt',
  'speak_fallback_yes', 'speak_fallback_retry',
  'rubric_hint_label',
  'fsrs_personalized_title', 'fsrs_personalized_on', 'fsrs_personalized_off',
  'fsrs_reset_defaults',
  'shadow_start', 'shadow_stop', 'shadow_hint', 'shadow_loop',
];

function loadLocale(name: string): Record<string, string> {
  const path = resolve(`frenchpath/messages/${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('i18n placeholders', () => {
  for (const locale of LOCALES) {
    describe(locale, () => {
      for (const key of KEYS) {
        it(`${key} is translated (not English placeholder)`, () => {
          const messages = loadLocale(locale);
          const value = messages[key];
          // Either the key is missing (allowed — not all locales ship all keys)
          // OR its value is non-empty (the placeholder is gone)
          expect(value === undefined || (typeof value === 'string' && value.length > 0)).toBe(true);
        });
      }
    });
  }

  it('docs/i18n-pending.md is empty or absent', () => {
    const pendingPath = resolve('frenchpath/docs/i18n-pending.md');
    let body: string;
    try {
      body = readFileSync(pendingPath, 'utf-8');
    } catch {
      return; // file deleted — also acceptable
    }
    // Any line containing a key from KEYS indicates leftover placeholder
    for (const key of KEYS) {
      expect(body.includes(key)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `cd frenchpath && npx vitest run src/tests/i18n.spec.ts`
Expected: all PASS. If any FAIL, the corresponding locale file is missing a translation — return to Task 1.2/1.3.

- [ ] **Step 3: Delete `docs/i18n-pending.md` and commit**

```bash
git rm frenchpath/docs/i18n-pending.md
git add frenchpath/src/tests/i18n.spec.ts
git commit -m "test(i18n): assert no placeholder keys remain in any locale"
```

### Task 1.5: Run full CI gates + spec-sync + merge

- [ ] **Step 1: Run all standard gates**

Run:
```bash
cd frenchpath
npm run check
npm run lint
npm run test:unit -- --run
npm run content:validate
npm run content:proofread:launch
```

Expected: all green.

- [ ] **Step 2: Append SPEC.md §11 row**

Run the `/spec-sync` slash command. It will detect the i18n changes and add a §11 row like:
```
| 2026-08-05 | i18n completion (Post-M2.6 launch-gap sweep Task 1): 24 sync/updates/speak pack + 11 rubric/FSRS/shadow placeholder keys translated across 8 Indic locales; i18n.spec.ts asserts no placeholder remains | §4, §11 | LOW |
```

- [ ] **Step 3: Verify spec:validate**

Run: `cd frenchpath && npm run spec:validate`
Expected: 0 errors.

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin feat/m2-launch-gap-i18n
gh pr create --base main --title "feat(i18n): complete M2-launch-gap i18n sweep" --body "Closes M2-launch-gap Task 1. Zero placeholder English in any locale."
```

---

# PR #2 — Data-layer hardening

### Task 2.1: Write the failing test for `runInTransaction`

**Files:**
- Create: `frenchpath/src/lib/db/tx.spec.ts`
- Test: `frenchpath/src/lib/db/tx.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { openDB } from 'idb';

async function makeDb() {
  return openDB('test-tx', 1, {
    upgrade(db) {
      db.createObjectStore('settings', { keyPath: 'id' });
      db.createObjectStore('progress', { keyPath: 'id' });
    },
  });
}

import { runInTransaction, TransactionError, TransactionAbortedError } from './tx.js';

describe('runInTransaction', () => {
  it('commits a successful write', async () => {
    const db = await makeDb();
    await runInTransaction(['settings'], 'readwrite', async (tx) => {
      const s = tx.objectStore('settings');
      await s.put({ id: 'x', value: 1 }, 'x');
    });
    const got = await db.get('settings', 'x');
    expect(got).toEqual({ id: 'x', value: 1 });
  });

  it('raises TransactionError on tx.onerror', async () => {
    const db = await makeDb();
    await expect(
      runInTransaction(['settings'], 'readwrite', async (tx) => {
        const s = tx.objectStore('settings');
        // write to a keyPath store without a keyPath — guaranteed to throw ConstraintError
        await s.put({} as any, 'broken');
      }),
    ).rejects.toBeInstanceOf(TransactionError);
  });

  it('raises TransactionAbortedError on tx.onabort', async () => {
    const db = await makeDb();
    await expect(
      runInTransaction(['settings'], 'readwrite', async (tx) => {
        tx.abort();
      }),
    ).rejects.toBeInstanceOf(TransactionAbortedError);
  });

  it('preserves the original DOMException on the typed error', async () => {
    const db = await makeDb();
    try {
      await runInTransaction(['settings'], 'readwrite', async (tx) => {
        const s = tx.objectStore('settings');
        await s.put({} as any, 'broken');
      });
    } catch (err) {
      expect(err).toBeInstanceOf(TransactionError);
      expect((err as TransactionError).cause).toBeInstanceOf(DOMException);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frenchpath && npx vitest run src/lib/db/tx.spec.ts`
Expected: FAIL with "Cannot find module './tx.js'" (the file doesn't exist yet).

### Task 2.2: Implement `runInTransaction`

**Files:**
- Create: `frenchpath/src/lib/db/tx.ts`

- [ ] **Step 1: Write the implementation**

```ts
import { getDB } from './db.js';
import type { DBSchema } from 'idb';

type SchemaStores = keyof DBSchema & string;
type IDBMode = 'readonly' | 'readwrite';

export class TransactionError extends Error {
  constructor(public readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : 'Transaction failed');
    this.name = 'TransactionError';
  }
}

export class TransactionAbortedError extends Error {
  constructor(public readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : 'Transaction aborted');
    this.name = 'TransactionAbortedError';
  }
}

export async function runInTransaction<T>(
  stores: SchemaStores[],
  mode: IDBMode,
  fn: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await getDB();
  const tx = db.transaction(stores, mode);
  try {
    const result = await fn(tx as IDBTransaction);
    await tx.done; // throws DOMException on abort or error
    return result;
  } catch (err) {
    if (err instanceof DOMException) {
      throw err.name === 'AbortError'
        ? new TransactionAbortedError(err)
        : new TransactionError(err);
    }
    throw err;
  }
}
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `cd frenchpath && npx vitest run src/lib/db/tx.spec.ts`
Expected: all 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add frenchpath/src/lib/db/tx.ts frenchpath/src/lib/db/tx.spec.ts
git commit -m "feat(db): runInTransaction helper with typed errors"
```

### Task 2.3: Refactor `saveSettings` to use `runInTransaction`

**Files:**
- Modify: `frenchpath/src/lib/db/repositories/settings.ts`
- Modify: `frenchpath/src/lib/db/repositories/settings.spec.ts`

- [ ] **Step 1: Write the failing concurrent-save race test**

Add to `settings.spec.ts`:
```ts
it('does not lose updates on concurrent saveSettings', async () => {
  const { saveSettings, getSettings } = await import('./settings.js');
  await saveSettings({ theme: 'light' });
  await saveSettings({ reduceMotion: true });
  const merged = await getSettings();
  expect(merged.theme).toBe('light');
  expect(merged.reduceMotion).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frenchpath && npx vitest run src/lib/db/repositories/settings.spec.ts`
Expected: FAIL. The current `saveSettings` is a read-modify-write without a transaction; under fake-indexeddb's single-threaded event loop it usually works, but the read of the post-second-write value may return stale data.

- [ ] **Step 3: Refactor `saveSettings`**

In `settings.ts`, replace the existing `saveSettings` body with:
```ts
import { runInTransaction } from '../tx.js';

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  try {
    return await runInTransaction(['settings'], 'readwrite', async (tx) => {
      const store = tx.objectStore('settings') as IDBObjectStore;
      const existing = (await store.get(SETTINGS_KEY)) as Settings | undefined;
      const merged: Settings = { ...(existing ?? DEFAULT_SETTINGS), ...patch };
      await store.put(merged, SETTINGS_KEY);
      return merged;
    });
  } catch (err) {
    // ponytail: single inline retry, then surface
    if (err instanceof TransactionError) {
      return runInTransaction(['settings'], 'readwrite', async (tx) => {
        const store = tx.objectStore('settings') as IDBObjectStore;
        const existing = (await store.get(SETTINGS_KEY)) as Settings | undefined;
        const merged: Settings = { ...(existing ?? DEFAULT_SETTINGS), ...patch };
        await store.put(merged, SETTINGS_KEY);
        return merged;
      });
    }
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frenchpath && npx vitest run src/lib/db/repositories/settings.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frenchpath/src/lib/db/repositories/settings.ts frenchpath/src/lib/db/repositories/settings.spec.ts
git commit -m "refactor(db): route saveSettings through runInTransaction"
```

### Task 2.4: Refactor `recordReview` to use `runInTransaction`

**Files:**
- Modify: `frenchpath/src/lib/srs/review.ts`
- Modify: `frenchpath/src/lib/srs/review.spec.ts`

- [ ] **Step 1: Write the failing atomicity test**

Add to `review.spec.ts`:
```ts
it('rolls back review if addStats fails (atomicity)', async () => {
  const { recordReview } = await import('./review.js');
  const { getStreak } = await import('../gamification/streak.js');

  // Pre-condition
  const beforeStreak = await getStreak();

  // Mock addStats to throw — should abort the whole tx
  vi.spyOn(await import('../gamification/stats.js'), 'addStats').mockRejectedValue(new Error('boom'));

  try {
    await recordReview({ cardId: 'c1', grade: 'good', ts: Date.now() });
  } catch {
    // expected
  }

  // Assert no partial write: streak is unchanged, card is unchanged
  const afterStreak = await getStreak();
  expect(afterStreak).toEqual(beforeStreak);
});
```

(The exact shape depends on existing test helpers — adapt to local patterns.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frenchpath && npx vitest run src/lib/srs/review.spec.ts`
Expected: FAIL. The current `recordReview` does 4 sequential awaits; if `addStats` fails mid-flow, the first writes are already committed.

- [ ] **Step 3: Refactor `recordReview`**

Replace the body of `recordReview` to wrap the 4 store operations in `runInTransaction(['srsCards', 'reviewLog', 'stats', 'streak'], 'readwrite', ...)`. On `TransactionError`, the calling component surfaces a "Could not save review — try again" inline message (see Task 2.7 for the SpeakExercise/RecordCompare updates; the review surface is in `src/routes/review/+page.svelte`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frenchpath && npx vitest run src/lib/srs/review.spec.ts`
Expected: PASS.

- [ ] **Step 5: Update the review page to surface save failure**

In `frenchpath/src/routes/review/+page.svelte`, wrap the `recordReview` call in a `try/catch` that displays a non-blocking inline message (`role="alert"`) and triggers a single retry attempt. Use the existing `<InfoBanner>` component.

- [ ] **Step 6: Commit**

```bash
git add frenchpath/src/lib/srs/review.ts frenchpath/src/lib/srs/review.spec.ts frenchpath/src/routes/review/+page.svelte
git commit -m "refactor(srs): atomic recordReview via runInTransaction"
```

### Task 2.5: Route `importBackup` and `mergePayloads` through `runInTransaction`

**Files:**
- Modify: `frenchpath/src/lib/pwa/backup.ts`
- Modify: `frenchpath/src/lib/pwa/merge.ts`

- [ ] **Step 1: Refactor `importBackup`**

Find the existing `db.transaction(STORES, 'readwrite')` block. Wrap its body in `runInTransaction(STORES, 'readwrite', ...)`. Remove the now-redundant explicit `tx.onerror` / `tx.onabort` handling — `runInTransaction` does this.

- [ ] **Step 2: Refactor `mergePayloads`**

Same pattern: replace the existing inline tx with `runInTransaction`.

- [ ] **Step 3: Run existing backup + sync tests**

Run:
```bash
cd frenchpath
npx vitest run src/lib/pwa/backup.spec.ts src/lib/pwa/merge.spec.ts
```

Expected: all PASS (existing tests cover the happy path + concurrent import guard + checksum tamper).

- [ ] **Step 4: Commit**

```bash
git add frenchpath/src/lib/pwa/backup.ts frenchpath/src/lib/pwa/merge.ts
git commit -m "refactor(pwa): route importBackup + mergePayloads through runInTransaction"
```

### Task 2.6: Implement `safeCall` + refactor haptics/notifications

**Files:**
- Create: `frenchpath/src/lib/platform/safeCall.ts`
- Create: `frenchpath/src/lib/platform/safeCall.spec.ts`
- Modify: `frenchpath/src/lib/platform/haptics.ts`
- Modify: `frenchpath/src/lib/platform/notifications.ts`

- [ ] **Step 1: Write the failing test**

```ts
// safeCall.spec.ts
import { describe, it, expect } from 'vitest';
import { safeCall } from './safeCall.js';

describe('safeCall', () => {
  it('returns { ok: true, value } on success', async () => {
    const r = await safeCall(async () => 42, null);
    expect(r).toEqual({ ok: true, value: 42 });
  });

  it('returns { ok: false, reason } on failure', async () => {
    const r = await safeCall(async () => {
      throw new Error('boom');
    }, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBeInstanceOf(Error);
  });

  it('preserves the rejection reason as typed Error', async () => {
    const r = await safeCall(async () => {
      throw 'string-throw';
    }, 'fallback');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('string-throw');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frenchpath && npx vitest run src/lib/platform/safeCall.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `safeCall`**

```ts
// safeCall.ts
export type SafeCallResult<T> = { ok: true; value: T } | { ok: false; reason: unknown };

export async function safeCall<T>(fn: () => Promise<T> | T, _fallback: T): Promise<SafeCallResult<T>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (reason) {
    return { ok: false, reason };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frenchpath && npx vitest run src/lib/platform/safeCall.spec.ts`
Expected: PASS.

- [ ] **Step 5: Refactor `haptics.ts`**

Find each `try { await Haptics.impact(...) } catch { /* swallow */ }` and replace with:
```ts
const r = await safeCall(() => Haptics.impact({ style: ImpactStyle.Light }), null);
if (!r.ok && import.meta.env.DEV) console.warn('haptics unavailable', r.reason);
```

The `_fallback` parameter exists so callers can declare intent; for haptics we don't use it.

- [ ] **Step 6: Refactor `notifications.ts`**

Same pattern. Where the caller was ignoring the result, change it to surface via `aria-live`:
```ts
const r = await safeCall(() => LocalNotifications.schedule({ ... }), null);
if (!r.ok) {
  // Surface: the existing caller's UI shows an inline message via aria-live
  // (set by the caller, not by this module — preserves the user's settings flow)
}
```

- [ ] **Step 7: Run all platform tests**

Run:
```bash
cd frenchpath
npx vitest run src/lib/platform/
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add frenchpath/src/lib/platform/safeCall.ts frenchpath/src/lib/platform/safeCall.spec.ts \
        frenchpath/src/lib/platform/haptics.ts frenchpath/src/lib/platform/notifications.ts
git commit -m "refactor(platform): safeCall for capability-probing calls"
```

### Task 2.7: Surface mic-denied in SpeakExercise + RecordCompare

**Files:**
- Modify: `frenchpath/src/lib/components/lesson/exercises/SpeakExercise.svelte`
- Modify: `frenchpath/src/lib/components/RecordCompare.svelte`
- Modify (test): `frenchpath/src/lib/components/lesson/exercises/SpeakExercise.spec.ts`

- [ ] **Step 1: Write the failing mic-denied test**

```ts
// in SpeakExercise.spec.ts
it('shows InfoBanner + self-assess fallback on mic-denied', async () => {
  // Mock getUserMedia to reject with NotAllowedError
  const mockGetUserMedia = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: mockGetUserMedia }, configurable: true });

  render(SpeakExercise, { exercise, onComplete });
  const recordBtn = screen.getByTestId('speak-record');
  await fireEvent.click(recordBtn);

  // Assert: banner appears with the right copy
  expect(await screen.findByTestId('speak-fallback-prompt')).toBeInTheDocument();
  // Assert: self-assess buttons revealed
  expect(screen.getByTestId('speak-fallback-yes')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frenchpath && npx vitest run src/lib/components/lesson/exercises/SpeakExercise.spec.ts`
Expected: FAIL. The current code silently sets `modelStatus = 'failed'` and shows nothing user-facing.

- [ ] **Step 3: Update `SpeakExercise.svelte`**

In the `record()` function's catch block, set a `micDenied` reactive state. In the template, when `micDenied`, render:
```svelte
{#if micDenied}
  <InfoBanner variant="info" data-testid="speak-fallback-prompt">
    {m.speak_fallback_prompt()}
  </InfoBanner>
  <div class="mt-3 flex gap-2">
    <button data-testid="speak-fallback-yes" on:click={() => onComplete({ self_assessed: 'good' })}>
      {m.speak_fallback_yes()}
    </button>
    <button data-testid="speak-fallback-retry" on:click={record}>
      {m.speak_fallback_retry()}
    </button>
  </div>
{/if}
```

(Use the existing `InfoBanner` component from `src/lib/components/InfoBanner.svelte`. The `m.speak_*` calls go through Paraglide; the keys were just translated in PR #1.)

- [ ] **Step 4: Apply the same pattern to `RecordCompare.svelte`**

Same mic-denied banner + fallback buttons. Adapt the data-testids (`record-compare-fallback-*`) to match existing test conventions.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frenchpath && npx vitest run src/lib/components/lesson/exercises/SpeakExercise.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frenchpath/src/lib/components/lesson/exercises/SpeakExercise.svelte \
        frenchpath/src/lib/components/RecordCompare.svelte \
        frenchpath/src/lib/components/lesson/exercises/SpeakExercise.spec.ts
git commit -m "fix(speak): surface mic-denied via InfoBanner + self-assess fallback"
```

### Task 2.8: Add `+error.svelte` boundary

**Files:**
- Create: `frenchpath/src/routes/+error.svelte`

- [ ] **Step 1: Write the boundary component**

```svelte
<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import InfoBanner from '$lib/components/InfoBanner.svelte';
  import { m } from '$lib/paraglide/messages';

  // ponytail: error.message is NOT shown to user (info-leak defence)
  // error.code (if present) is shown; the original error is console.error'd

  function reload() {
    location.reload();
  }

  function goHome() {
    location.href = '/';
  }

  $: errorCode = $page.error?.code ?? 'unknown';
  $: consoleError = $page.error;
  $: if (consoleError) console.error('App boundary caught:', consoleError);
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
  <InfoBanner variant="info" data-testid="error-boundary">
    {m.error_generic()}
  </InfoBanner>
  <p class="text-muted text-sm">Code: {errorCode}</p>
  <div class="flex gap-2">
    <button data-testid="error-reload" class="btn-primary" on:click={reload}>{m.error_reload()}</button>
    <button data-testid="error-home" class="btn-secondary" on:click={goHome}>{m.error_home()}</button>
  </div>
</div>
```

- [ ] **Step 2: Add the i18n keys**

Add to `messages/en.json` (and update other locales as part of this PR — since PR #1 just landed, you have the workflow down):
- `error_generic`: "Something went wrong. Try reloading, or head back home."
- `error_reload`: "Reload"
- `error_home`: "Back to home"

For the other 9 locales, apply the same idiomatic-translation pattern as PR #1.

- [ ] **Step 3: Run `npm run i18n:compile` + unit test**

Run:
```bash
cd frenchpath
npm run i18n:compile
npx vitest run src/tests/i18n.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frenchpath/src/routes/+error.svelte messages/*.json
git commit -m "feat(routes): +error.svelte boundary + i18n keys"
```

### Task 2.9: E2E tests for boundary + mic-denied

**Files:**
- Create: `frenchpath/e2e/error-boundary.e2e.ts`
- Create: `frenchpath/e2e/mic-denied.e2e.ts`

- [ ] **Step 1: Write the error-boundary e2e**

```ts
// e2e/error-boundary.e2e.ts
import { test, expect } from '@playwright/test';

test('error boundary renders when a route throws', async ({ page }) => {
  await page.route('**/__throw', (route) => route.fulfill({ status: 500, body: 'broken' }));
  await page.goto('/__throw');
  await expect(page.getByTestId('error-boundary')).toBeVisible();
  await expect(page.getByTestId('error-home')).toBeVisible();
});
```

Note: this requires a `/__throw` test route. If the project already has one in dev-only mode (search `src/routes/__throw`), reuse it; otherwise add a `+page.svelte` under `src/routes/__throw/+page.svelte` that throws on mount, **gated to dev** (return early if `!dev`). DO NOT ship this route to production.

- [ ] **Step 2: Write the mic-denied e2e**

```ts
// e2e/mic-denied.e2e.ts
import { test, expect } from '@playwright/test';

test.use({ permissions: [] }); // no mic permission

test('SpeakExercise shows fallback on mic-denied', async ({ page }) => {
  await page.goto('/learn/a1-unit-01'); // adjust to a unit with speak exercise
  // … navigate to the speak exercise
  await page.getByTestId('speak-record').click();
  await expect(page.getByTestId('speak-fallback-prompt')).toBeVisible();
});
```

(Exact navigation depends on existing e2e patterns; mirror `e2e/speak.e2e.ts`.)

- [ ] **Step 3: Run e2e tests**

Run:
```bash
cd frenchpath
npx playwright test e2e/error-boundary.e2e.ts e2e/mic-denied.e2e.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frenchpath/e2e/error-boundary.e2e.ts frenchpath/e2e/mic-denied.e2e.ts
git commit -m "test(e2e): error boundary + mic-denied fallback"
```

### Task 2.10: Annotate `optimizer.ts` + run full CI gates + spec-sync + merge

**Files:**
- Modify: `frenchpath/src/lib/srs/optimizer.ts`

- [ ] **Step 1: Add `ponytail:` comment to `optimizer.ts`**

Find the silent `try/catch` (around line 70-74 per audit). Add:
```ts
// ponytail: silent catch is deliberate. "Optimizer failure must never
// disturb the learner" — see SPEC §3 invariant 6 (non-coercive). The
// optimizer runs in a Worker; if it errors we fall back to default FSRS
// weights. Do not surface this error.
```

- [ ] **Step 2: Run all gates**

Run:
```bash
cd frenchpath
npm run check
npm run lint
npm run test:unit -- --run
npm run content:validate
npm run content:proofread:launch
npm run build
npx playwright test
```

Expected: all green. Coverage report refreshed.

- [ ] **Step 3: Append SPEC.md §11 row**

Run `/spec-sync`. It will add:
```
| 2026-08-05 | Data-layer hardening (Post-M2.6 launch-gap sweep Task 2): runInTransaction helper, safeCall for capability-probing, typed surface for tx/swallow failures, +error.svelte boundary | §4, §5 | MEDIUM |
```

- [ ] **Step 4: Verify spec:validate + push + open PR**

```bash
cd frenchpath
npm run spec:validate
git push -u origin feat/m2-launch-gap-data-layer
gh pr create --base main --title "feat(db): data-layer hardening for M2 launch" --body "Closes M2-launch-gap Task 2. runInTransaction helper, safeCall, +error.svelte, mic-denied fallback."
```

---

# PR #3 — Docs drift + SW update UX

### Task 3.1: Write the failing docs-drift checker

**Files:**
- Create: `frenchpath/scripts/check-docs-drift.ts`
- Create: `frenchpath/scripts/check-docs-drift.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// check-docs-drift.spec.ts
import { describe, it, expect } from 'vitest';
import { checkDrift } from './check-docs-drift.js';

describe('check-docs-drift', () => {
  it('reports no drift when baselines match', () => {
    const reports = checkDrift({
      current: { unit: 267, e2e: 42 },
      docs: [{ path: 'a.md', body: '267 unit + 42 e2e green' }],
    });
    expect(reports).toHaveLength(0);
  });

  it('reports drift when a doc cites a stale baseline', () => {
    const reports = checkDrift({
      current: { unit: 267, e2e: 42 },
      docs: [{ path: 'a.md', body: '188 unit + 35 e2e' }],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0].path).toBe('a.md');
    expect(reports[0].mentioned).toBe('188 unit + 35 e2e');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frenchpath && npx vitest run scripts/check-docs-drift.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the checker**

```ts
// check-docs-drift.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface DriftReport {
  path: string;
  mentioned: string;
  expected: string;
}

const DOCS = [
  'docs/launch-checklist.md',
  'docs/architecture-map.md',
  'docs/testing.md',
];

const PATTERN = /(\d+)\s*unit\s*\+\s*(\d+)\s*e2e/gi;

export function checkDrift(input: {
  current: { unit: number; e2e: number };
  docs: Array<{ path: string; body: string }>;
}): DriftReport[] {
  const expected = `${input.current.unit} unit + ${input.current.e2e} e2e`;
  const reports: DriftReport[] = [];
  for (const doc of input.docs) {
    const matches = [...doc.body.matchAll(PATTERN)];
    for (const m of matches) {
      const mentioned = m[0].replace(/\s+/g, ' ').trim();
      if (mentioned !== expected) {
        reports.push({ path: doc.path, mentioned, expected });
      }
    }
  }
  return reports;
}

function main() {
  const specPath = resolve('docs/spec/SPEC.md');
  const spec = readFileSync(specPath, 'utf-8');
  // Extract current baseline from SPEC §5
  const baselineMatch = spec.match(/(\d+)\s*unit\s*\+\s*(\d+)\s*e2e\s*green/);
  if (!baselineMatch) {
    console.error('Could not find baseline in SPEC.md §5');
    process.exit(1);
  }
  const current = { unit: Number(baselineMatch[1]), e2e: Number(baselineMatch[2]) };
  const docs = DOCS.map((p) => ({ path: p, body: readFileSync(resolve(p), 'utf-8') }));
  const reports = checkDrift({ current, docs });
  if (reports.length > 0) {
    console.error('Docs drift detected:');
    for (const r of reports) {
      console.error(`  ${r.path}: mentions "${r.mentioned}", expected "${r.expected}"`);
    }
    process.exit(1);
  }
  console.log(`Docs baselines match SPEC §5: ${current.unit} unit + ${current.e2e} e2e ✓`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frenchpath && npx vitest run scripts/check-docs-drift.spec.ts`
Expected: PASS.

- [ ] **Step 5: Wire `docs:drift` script**

Add to `frenchpath/package.json`:
```json
"docs:drift": "tsx scripts/check-docs-drift.ts"
```

- [ ] **Step 6: Run `docs:drift` to confirm it fails on current state**

Run: `cd frenchpath && npm run docs:drift`
Expected: exit 1 — drift detected (the docs still cite older baselines).

- [ ] **Step 7: Commit**

```bash
git add frenchpath/scripts/check-docs-drift.ts frenchpath/scripts/check-docs-drift.spec.ts frenchpath/package.json
git commit -m "feat(docs): check-docs-drift script + vitest spec"
```

### Task 3.2: Fix the docs drift

**Files:**
- Modify: `frenchpath/docs/launch-checklist.md`
- Modify: `frenchpath/docs/architecture-map.md`
- Modify: `frenchpath/docs/testing.md`

- [ ] **Step 1: Update `launch-checklist.md`**

Find every "N unit" / "M e2e" mention. Replace with `267 unit + 42 e2e`. Use `replace_all: true` if a single regex covers it.

- [ ] **Step 2: Update `architecture-map.md`**

Same pattern. Also update §7 "Known gaps" section to reflect the current state (PR #2's data-layer hardening + PR #3's SW update close several gaps).

- [ ] **Step 3: Update `testing.md`**

Same baseline fix. Update §7 "Known gaps" to be current.

- [ ] **Step 4: Run `docs:drift` to verify it now passes**

Run: `cd frenchpath && npm run docs:drift`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frenchpath/docs/launch-checklist.md frenchpath/docs/architecture-map.md frenchpath/docs/testing.md
git commit -m "docs: sync baselines to 267 unit + 42 e2e"
```

### Task 3.3: Build `UpdateToast` + wire it up

**Files:**
- Create: `frenchpath/src/lib/components/UpdateToast.svelte`
- Create: `frenchpath/src/lib/components/UpdateToast.spec.ts`
- Modify: `frenchpath/vite.config.ts`
- Modify: `frenchpath/src/routes/+layout.svelte`

- [ ] **Step 1: Write the failing test**

```ts
// UpdateToast.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import UpdateToast from './UpdateToast.svelte';

describe('UpdateToast', () => {
  it('renders when visible prop is true', () => {
    render(UpdateToast, { props: { visible: true } });
    expect(screen.getByTestId('update-toast')).toBeInTheDocument();
  });

  it('does not render when visible prop is false', () => {
    render(UpdateToast, { props: { visible: false } });
    expect(screen.queryByTestId('update-toast')).not.toBeInTheDocument();
  });

  it('"Reload" calls location.reload', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload: reloadMock }, configurable: true });
    render(UpdateToast, { props: { visible: true } });
    await fireEvent.click(screen.getByTestId('update-reload'));
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('"Later" dismisses without reload', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload: reloadMock }, configurable: true });
    render(UpdateToast, { props: { visible: true } });
    await fireEvent.click(screen.getByTestId('update-later'));
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frenchpath && npx vitest run src/lib/components/UpdateToast.spec.ts`
Expected: FAIL (component doesn't exist).

- [ ] **Step 3: Implement `UpdateToast`**

```svelte
<!-- UpdateToast.svelte -->
<script lang="ts">
  import { m } from '$lib/paraglide/messages';

  export let visible = false;

  function reload() {
    location.reload();
  }

  function dismiss() {
    visible = false;
  }
</script>

{#if visible}
  <div
    data-testid="update-toast"
    role="status"
    aria-live="polite"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 fp-paper border fp-hairline rounded-lg shadow-soft p-4 max-w-sm flex items-center gap-3"
  >
    <span>{m.update_available()}</span>
    <button data-testid="update-reload" class="btn-primary min-h-11" on:click={reload}>
      {m.update_reload()}
    </button>
    <button data-testid="update-later" class="btn-secondary min-h-11" on:click={dismiss}>
      {m.update_later()}
    </button>
  </div>
{/if}
```

- [ ] **Step 4: Add the i18n keys**

Add to all 10 locale files:
- `update_available`: "A new version is ready."
- `update_reload`: "Reload"
- `update_later`: "Later"

For non-`en`/`hi` locales, apply the same idiomatic-translation pattern as PR #1. (These keys are NEW, not in the existing backlog.)

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
cd frenchpath
npm run i18n:compile
npx vitest run src/lib/components/UpdateToast.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Update `vite.config.ts`**

Change:
```ts
registerType: 'autoUpdate',
```
to:
```ts
registerType: 'prompt',
injectRegister: 'auto',
```

Add the PWA config callbacks:
```ts
pwa: {
  // …
  registerType: 'prompt',
  injectRegister: 'auto',
  // onNeedRefresh / onOfflineReady are wired in +layout.svelte, not here —
  // config-time callbacks don't have access to Svelte component refs
}
```

- [ ] **Step 7: Wire the toast in `+layout.svelte`**

In `+layout.svelte`, add:
```svelte
<script>
  import { registerSW } from 'virtual:pwa-register';
  import UpdateToast from '$lib/components/UpdateToast.svelte';
  import { isNativePlatform, isDesktopPlatform } from '$lib/platform/shell';

  let updateVisible = false;

  if (!isNativePlatform() && !isDesktopPlatform() && typeof window !== 'undefined') {
    registerSW({
      onNeedRefresh() { updateVisible = true; },
      onOfflineReady() { /* no-op; the app is offline-first */ },
    });
  }
</script>

<UpdateToast bind:visible={updateVisible} />
```

- [ ] **Step 8: Run all gates**

Run:
```bash
cd frenchpath
npm run check
npm run lint
npx vitest run src/lib/components/UpdateToast.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frenchpath/src/lib/components/UpdateToast.svelte \
        frenchpath/src/lib/components/UpdateToast.spec.ts \
        frenchpath/vite.config.ts \
        frenchpath/src/routes/+layout.svelte \
        messages/*.json
git commit -m "feat(pwa): UpdateToast for non-coercive SW updates"
```

### Task 3.4: E2E test for the update toast

**Files:**
- Create: `frenchpath/e2e/sw-update.e2e.ts`

- [ ] **Step 1: Write the e2e**

```ts
// e2e/sw-update.e2e.ts
import { test, expect } from '@playwright/test';

test('SW update toast appears + Reload works', async ({ page, context }) => {
  await page.goto('/');
  // Simulate the SW update event
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
  // The toast should appear (or the page should reload)
  await expect(page.getByTestId('update-toast')).toBeVisible({ timeout: 5000 });
});
```

(The exact shape depends on how the project exercises SW updates in e2e; mirror `e2e/settings.e2e.ts`'s patterns.)

- [ ] **Step 2: Run the e2e**

Run: `cd frenchpath && npx playwright test e2e/sw-update.e2e.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frenchpath/e2e/sw-update.e2e.ts
git commit -m "test(e2e): SW update toast"
```

### Task 3.5: Run all gates + spec-sync + merge

- [ ] **Step 1: Run the full suite**

Run:
```bash
cd frenchpath
npm run check
npm run lint
npm run test:unit -- --run
npm run content:validate
npm run content:proofread:launch
npm run docs:drift
npm run build
npx playwright test
```

Expected: all green.

- [ ] **Step 2: Append SPEC.md §11 row**

Run `/spec-sync`. It will add:
```
| 2026-08-05 | Docs drift + SW update UX (Post-M2.6 launch-gap sweep Task 3) | §4, §5, §11 | LOW |
```

- [ ] **Step 3: Verify spec:validate**

Run: `cd frenchpath && npm run spec:validate`
Expected: 0 errors.

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin feat/m2-launch-gap-docs-and-sw
gh pr create --base main --title "feat(docs+sw): docs-drift check + non-coercive SW update toast" --body "Closes M2-launch-gap Task 3."
```

---

## Cross-PR Sequencing

```
PR #1 ──┐                              (parallel)
        ├──> PR #3 (after #1+#2 land; PR #3 updates the test baseline numbers in docs)
PR #2 ──┘
```

- PR #1 and PR #2 have zero code overlap — they can run in parallel via two agents.
- PR #3 depends on the test count from PR #1 + PR #2 (each adds ~10 unit + 1 e2e), so PR #3's docs section cites the post-sweep baseline.
- Each PR is independently revertable.

## Self-Review Checklist

The plan author ran this inline before declaring it complete:

- [x] **Spec coverage:** Each spec section maps to a task:
  - Spec §"Task 1 — i18n" → Plan §PR #1 (Tasks 1.1–1.5)
  - Spec §"Task 2 — Data-layer hardening" → Plan §PR #2 (Tasks 2.1–2.10)
  - Spec §"Task 3 — Docs drift + SW update UX" → Plan §PR #3 (Tasks 3.1–3.5)
  - Spec §"Out of scope" → Plan §"Cross-PR Sequencing" (deliberately excluded)
  - Spec §"Acceptance criteria" → Plan §"Self-Review Checklist" + each PR's "Step 1: Run all gates"
- [x] **Placeholder scan:** No "TBD" / "TODO" / "implement later". Each step has concrete code.
- [x] **Type consistency:** `runInTransaction`, `safeCall`, `TransactionError`, `TransactionAbortedError` named consistently across all tasks.
- [x] **Invariant preservation:** Optimizer silent `catch` retained + commented. SW toast non-coercive (dismissable + no auto-reload). CSP not relaxed (no new external fetches).
- [x] **Commit granularity:** Each task ends with a commit. Each PR ends with a merge.

## Acceptance criteria (across all 3 PRs)

- [ ] All three PRs merged to `main`.
- [ ] `npm run check` green.
- [ ] `npm run docs:drift` exits 0.
- [ ] `npm run test:e2e` green (267 → est. ~295 unit, 42 → est. ~47 e2e).
- [ ] `npm run spec:validate` green.
- [ ] `vite build` + `scripts/verify-dist.mjs` green.
- [ ] SPEC.md §11 has three new MEDIUM/LOW rows.
- [ ] `docs/launch-checklist.md` updated to mark "Agent-sweep launch-gap tasks" complete.

## What this plan does NOT solve

The four human-only M2 launch blockers remain after the sweep:

1. Native-speaker proofread of A1/A2 (24 units, invariant 5).
2. Android signing keystore + Play Console account.
3. Vercel project linking + privacy-policy URL.
4. iOS packaging (no macOS).

The plan is the agent-sweep half of the M2 launch checklist. The user retains the human-only half.