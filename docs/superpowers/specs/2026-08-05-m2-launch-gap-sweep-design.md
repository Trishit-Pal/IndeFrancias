# M2 Launch-Gap Sweep — Design

> **Status:** approved 2026-08-05. **Severity:** MEDIUM for §4 capability edits; LOW for §5/§11 wording. No §3 invariant or §7 ADR touched.

## Context

L'Indigo Express / FrenchPath closed its **M2.6 — Complete Local Product** milestone on
2026-07-11 (20 tasks: writing rubric, FSRS optimizer, Vosk ASR + shadowing, E2EE sync,
opt-in update-check, packaging) and the **L'Indigo Express** UI revamp on 2026-07-14
(`feat/ui-revamp-indigo-express`). The repo is at 267 unit + 42 e2e green and the
mother-book SPEC.md is current.

Three of the four human-only M2-launch blockers are out of scope for an agent sweep:

1. Native-speaker proofread of A1/A2 (24 units, invariant 5).
2. Android signing keystore + Play Console account.
3. Vercel project linking + privacy-policy URL.

What an agent **can** do in this window is reduce the M2-launch gap by tightening the
23 shipped capabilities to a launch-grade bar. Today's audit found:

- **i18n debt.** `docs/i18n-pending.md` lists the 24 placeholders (sync + updates + speak
  pack + rubric/FSRS/shadow keys) still rendering English copy in 8 Indic locales.
- **Data-layer atomicity risk.** `saveSettings` (read-modify-write, no transaction) and
  `recordReview` (4 sequential awaits, no transaction) can lose updates on crash or
  concurrent save. Backups and sync imports already use a transaction; settings and SRS
  review don't.
- **Silent error swallows.** `optimizer.ts` (deliberate, invariant), `haptics.ts`,
  `notifications.ts`, `SpeakExercise.svelte` (mic-denied), `RecordCompare.svelte` all
  swallow errors. Only the optimizer is documented as such.
- **Docs drift.** `launch-checklist.md` and `architecture-map.md` still cite older
  baselines (256/188 unit, 35 e2e). `frenchpath/coverage/` is stale June 13.
- **No SW update UX.** `registerType: 'autoUpdate'` + silent take-over. Users on long
  sessions won't see new content for hours/days.
- **No `+error.svelte` boundary.** Any render error becomes a blank page.

The intended outcome: ship three independent, individually-revertable PRs that close the
launch gap without touching capabilities, invariants, or ADRs. After the sweep, the
agent-sweep part of the M2 launch checklist is complete; only the human-only blockers
remain.

## Scope

Three independent task workstreams. Each is a single PR. Each gets its own spec-sync
entry. No cross-task code sharing.

### Task 1 — i18n completion (PR #1)

**Goal:** zero placeholder English in any of the 10 locales.

**Files edited:**

- `frenchpath/messages/{bn,ta,te,kn,mr,gu,pa,hinglish}.json` — replace the 24 placeholder
  values with real translations. Source list: `docs/i18n-pending.md` (current contents).
  - `sync_title`, `sync_body`, `sync_export`, `sync_import`, `sync_passphrase_label`,
    `sync_passphrase_hint`, `sync_preview_title`, `sync_preview_body`, `sync_confirm`,
    `sync_wrong_passphrase`, `sync_success` (11 keys)
  - `updates_title`, `updates_toggle_label`, `updates_privacy_note`, `updates_available`,
    `updates_current`, `updates_check_now` (6 keys)
  - `speak_pack_title`, `speak_pack_body`, `speak_pack_download`, `speak_pack_progress`,
    `speak_record`, `speak_stop`, `speak_transcribing`, `speak_result_good`,
    `speak_result_partial`, `speak_result_retry`, `speak_fallback_prompt`,
    `speak_fallback_yes`, `speak_fallback_retry` (13 keys)
- `docs/i18n-pending.md` — delete the task rows; replace with a single "Completed 2026-08-05"
  header. Task is done; the file goes quiet until the next feature ships.
- `frenchpath/src/tests/i18n.spec.ts` (**new**) — asserts every key originally present in
  `docs/i18n-pending.md` is no longer a placeholder in any locale file. Reads the locale
  files, parses JSON, asserts Hindi values are propagated to the other 8 locales (or
  per-language idiomatic translations exist).

**Pre-PR verification:** before merging, `git grep` for each of the original 24 keys
plus the older `rubric_hint_label`, `fsrs_personalized_*`, `shadow_*` across all 10
locale files. If any of the older 15 keys still shows English placeholder copy in any
non-`en`/`hi` locale, fold them into this PR. The new `i18n.spec.ts` test asserts the
final state: no placeholder English in any non-English locale.

**Success criteria:**

- `npm run i18n:compile` passes.
- `npm run test:unit -- src/tests/i18n.spec.ts` passes.
- `docs/i18n-pending.md` contains zero placeholder keys.
- Spec-sync: append §11 row "2026-08-05 — i18n completion (Post-M2.6 launch-gap sweep Task 1)
  | §4 | LOW".

### Task 2 — Data-layer hardening (PR #2)

**Goal:** multi-store writes are atomic; silent error swallows are typed or surfaced.

**New files:**

- `frenchpath/src/lib/db/tx.ts` — `runInTransaction(stores, mode, fn)` typed wrapper
  around `idb`'s `db.transaction(stores, mode)`. Catches `tx.onerror` and `tx.onabort`,
  re-raises as `TransactionError` / `TransactionAbortedError` with original
  `DOMException` preserved (no information loss). Promises `tx.done` so partial-write
  failures propagate to the caller.
- `frenchpath/src/lib/platform/safeCall.ts` — `safeCall(fn, fallback): Promise<{ ok: true, value } | { ok: false, reason }>`.
  Used for capability-probing calls (haptics, notifications) where failure is common
  and expected on web/desktop.
- `frenchpath/src/routes/+error.svelte` — SvelteKit boundary. Renders an `InfoBanner`
  with `error.code` (if present) + a "Reload" button that re-runs the navigation + a
  "Back to home" CTA. No telemetry, no `error.message` shown to the user (info-leak
  defence). Console-errors the original for debugging.
- `frenchpath/src/lib/db/tx.spec.ts` — success / onerror / onabort / DOMException
  preservation.
- `frenchpath/src/lib/platform/safeCall.spec.ts` — success / fallback / typed reason.
- `frenchpath/src/lib/components/lesson/exercises/SpeakExercise.spec.ts` (extend) —
  mic-denied path shows `InfoBanner` + self-assess CTA.
- `frenchpath/e2e/error-boundary.e2e.ts` (**new**) — triggers a render error, asserts
  the boundary renders + "Back to home" works.
- `frenchpath/e2e/mic-denied.e2e.ts` (**new**) — denies mic permission, asserts the
  `SpeakExercise` fallback shows the InfoBanner + self-assess CTA.

**Files edited:**

- `frenchpath/src/lib/db/repositories/settings.ts` — `saveSettings` → `runInTransaction`
  call. On `TransactionError`, surface as inline toast (5-second lived, non-blocking).
- `frenchpath/src/lib/srs/review.ts` — `recordReview` → `runInTransaction` call over
  `srsCards`, `reviewLog`, `stats`, `streak`. On `TransactionError`, surface a "Could not
  save review — try again" inline with one retry attempt.
- `frenchpath/src/lib/pwa/backup.ts` — `importBackup` already in a tx; route through
  `runInTransaction` for consistency.
- `frenchpath/src/lib/pwa/merge.ts` — same.
- `frenchpath/src/lib/srs/optimizer.ts` — keep silent `try/catch` (invariant). Add a
  `ponytail:` comment documenting the choice.
- `frenchpath/src/lib/platform/haptics.ts` — `try/catch` → `safeCall(haptics.impact, null)`.
  Return value not surfaced (haptics are decorative).
- `frenchpath/src/lib/platform/notifications.ts` — `try/catch` → `safeCall(...)`. Return
  surfaced via the existing `showRevisionNotification` caller's `aria-live` region.
- `frenchpath/src/lib/components/lesson/exercises/SpeakExercise.svelte` — `record()`
  failure → `InfoBanner` "Mic permission denied — use the self-assess fallback below"
  + reveal the fallback CTAs immediately.
- `frenchpath/src/lib/components/RecordCompare.svelte` — same.

**Test additions:**

- `frenchpath/src/lib/db/repositories/settings.spec.ts` (extend) — concurrent-save race
  test using `fake-indexeddb`: two `saveSettings` in parallel; assert no lost update
  (merge wins).
- `frenchpath/src/lib/srs/review.spec.ts` (extend) — `recordReview` atomicity test:
  mock `addStats` to throw; assert `srsCards` and `streak` are NOT in a partial-write
  state.

**Success criteria:**

- All existing tests still pass; coverage on touched modules ≥ 80%.
- `pwa-data-reviewer` review gate (per `.cursor/skills/frenchpath-data`): approve.
- `offline-data-safety` companion review: approve.
- Spec-sync: append §11 row "2026-08-05 — Data-layer hardening (Post-M2.6 launch-gap
  sweep Task 2): `runInTransaction` helper, `safeCall` for capability-probing, typed
  surface for tx/swallow failures, `+error.svelte` boundary | §4, §5 | MEDIUM".

### Task 3 — Docs drift + SW update UX (PR #3)

**Goal:** documentation claims match code truth; users see a new-version toast after a
deploy.

**New files:**

- `frenchpath/scripts/check-docs-drift.ts` — reads `docs/launch-checklist.md`,
  `docs/architecture-map.md`, `docs/testing.md`, grep for `N unit` / `M e2e` patterns,
  asserts each matches the current SPEC §5 baseline (`267 unit + 42 e2e`). Exits
  non-zero with a clear message if any drift is found. Wired as `npm run docs:drift`.
- `frenchpath/src/lib/components/UpdateToast.svelte` — small bottom-anchored toast
  matching the L'Indigo Express design system. `data-testid="update-toast"`. Listens to
  PWA `registerSW` callbacks. Hidden on native + desktop (per existing
  `isNativePlatform()` / `isDesktopPlatform()` guards). "Reload" calls `location.reload()`;
  "Later" dismisses.
- `frenchpath/scripts/check-docs-drift.spec.ts` — unit test of the drift checker.

**Files edited:**

- `docs/launch-checklist.md` — replace every stale baseline with `267 unit + 42 e2e`.
- `docs/architecture-map.md` — same.
- `docs/testing.md` — same; also update §7 known gaps to reflect the current state.
- `frenchpath/vite.config.ts` — `registerType: 'autoUpdate'` → `'prompt'`. Pass
  `onNeedRefresh` and `onOfflineReady` callbacks that open/close the toast.
- `frenchpath/src/routes/+layout.svelte` — register the toast listener (web only).
  Update the existing `eslint-disable` `webManifestLink` line if the toast adds a new
  `{@html}` (it shouldn't — the toast is a Svelte component).
- `frenchpath/e2e/sw-update.e2e.ts` (**new**) — installs a fake newer SW via
  `serviceWorker.controller.postMessage`, asserts the toast appears, accepts the
  reload, asserts the page reloads.

**Out of scope:** HSTS preload registration, privacy-policy URL, Play Store listing
copy. These are human-only launch blockers.

**Success criteria:**

- `npm run docs:drift` exits 0.
- `npm run check` passes.
- E2E `sw-update.e2e.ts` passes.
- Coverage: `UpdateToast.spec.ts` renders + interaction unit tests.
- Spec-sync: append §11 row "2026-08-05 — Docs drift + SW update UX (Post-M2.6 launch-gap
  sweep Task 3) | §4, §5, §11 | LOW".

## Out of scope (deferred)

- **Badge persistence** — explicitly deferred in `gamification/activity.ts:31-32`.
  Out of scope for an agent sweep; needs a separate spec.
- **Confidence-signal surfacing** — `ConfidenceSnapshot[]` ring buffer is collected but
  never displayed. Out of scope; a feature of its own.
- **Sample/demo lesson in onboarding** — out of scope; a feature.
- **Settings page refactor** — 888 lines but the user explicitly declined to refactor
  in this sweep.
- **Tauri installer build** — requires VS Build Tools on the maintainer's machine.
  Human-only.
- **Argon2id swap for PBKDF2@600k** — declared adequate today (`sync/crypto.ts:2-3`).
  Upgrade path noted; no threat-model change today.
- **iOS packaging** — no macOS. Explicitly deferred.

## Architecture

Three independent PRs. Each merges cleanly without the next. Each gets its own
spec-sync entry. Each is independently revertable.

```
PR #1 (i18n)             PR #2 (data-layer)         PR #3 (docs + SW)
─────                    ─────                      ─────
messages/*.json          src/lib/db/tx.ts           docs/*.md
docs/i18n-pending.md     src/lib/platform/safeCall  scripts/check-docs-drift
src/tests/i18n.spec.ts   src/routes/+error.svelte   src/lib/components/UpdateToast
                         src/lib/db/* (refactor)    vite.config.ts (registerType)
                         src/lib/srs/* (refactor)   src/routes/+layout.svelte
                         src/lib/pwa/* (refactor)
                         src/lib/platform/* (refactor)
                         src/lib/components/lesson/exercises/SpeakExercise.svelte
                         src/lib/components/RecordCompare.svelte
                         + tests + e2e
```

**No cross-PR code sharing.** PR #1 doesn't touch anything PR #2 touches. PR #3 only
touches `vite.config.ts` and `+layout.svelte` for SW registration, which is orthogonal
to the data-layer work.

## Data flow

### PR #2 — `runInTransaction`

```ts
// src/lib/db/tx.ts
export async function runInTransaction<T>(
  stores: Stores[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await getDB();
  const tx = db.transaction(stores, mode);
  try {
    const result = await fn(tx);
    await tx.done; // throws DOMException on abort/error
    return result;
  } catch (err) {
    // tx auto-aborted; surface typed error with original DOMException preserved
    if (err instanceof DOMException) {
      throw err.name === 'AbortError'
        ? new TransactionAbortedError(err)
        : new TransactionError(err);
    }
    throw err;
  }
}
```

Call sites:

```ts
// saveSettings
return runInTransaction(['settings'], 'readwrite', async (tx) => {
  const s = tx.objectStore('settings');
  const existing = (await s.get(SETTINGS_KEY)) ?? DEFAULT_SETTINGS;
  const merged = { ...existing, ...patch };
  await s.put(merged, SETTINGS_KEY);
  return merged;
});
```

### PR #3 — SW update toast

```
registerSW({ onNeedRefresh: showToast, onOfflineReady: hideToast })
  ↓
controllerchange event → new SW waiting
  ↓
UpdateToast: "New version ready" [Reload] [Later]
  ↓
Reload → location.reload()
  ↓
Toast never shows on native (isNativePlatform) or desktop (isDesktopPlatform)
```

## Error handling

| Site | Old | New |
|---|---|---|
| `saveSettings` | silent save | runInTransaction; on abort, inline toast + one retry |
| `recordReview` | 4 sequential awaits, no tx | runInTransaction over 4 stores; on abort, inline "try again" |
| `backup.importBackup` | inline tx | runInTransaction (for consistency) |
| `sync.mergeFile` | inline tx | runInTransaction (for consistency) |
| `optimizer.ts` | silent `try/catch` | unchanged + `ponytail:` comment |
| `haptics.ts` | silent `try/catch` | safeCall, return value not surfaced |
| `notifications.ts` | silent `try/catch` | safeCall, surfaced via `aria-live` |
| `SpeakExercise.svelte` (mic) | silent fallback | InfoBanner + reveal self-assess CTAs |
| `RecordCompare.svelte` (mic) | silent fallback | InfoBanner + reveal self-assess CTAs |
| any render error | blank page | `+error.svelte` boundary |

**Invariant preserved:** "Optimizer failure must never disturb the learner" — `optimizer.ts`
silent `try/catch` is intentionally retained. The `ponytail:` comment documents the
choice.

**Info-leak defence:** `+error.svelte` does NOT render `error.message` to the user. It
renders `error.code` (if present) and a generic "Something went wrong" + CTAs. The
original error is `console.error`'d for debugging.

## Testing

| Layer | Test |
|---|---|
| Unit (new) | `tx.spec.ts` — success / onerror / onabort / DOMException preserved |
| Unit (new) | `safeCall.spec.ts` — success / fallback / typed reason |
| Unit (new) | `check-docs-drift.spec.ts` — drift detection |
| Unit (new) | `UpdateToast.spec.ts` — render + interaction |
| Unit (extend) | `settings.spec.ts` — concurrent save race |
| Unit (extend) | `review.spec.ts` — `recordReview` atomicity |
| Unit (extend) | `SpeakExercise.spec.ts` — mic-denied banner |
| Unit (new) | `i18n.spec.ts` — no placeholder keys in any locale |
| E2E (new) | `error-boundary.e2e.ts` — render error → boundary |
| E2E (new) | `mic-denied.e2e.ts` — mic denied → fallback |
| E2E (new) | `sw-update.e2e.ts` — new SW → toast → reload |

**Coverage target:** 80%+ on touched modules. Coverage report refreshed at the end of
PR #2 (this is the largest change).

**Spec-sync tests:** `spec:validate` must pass after each PR.

## Acceptance criteria

For the sweep to be "done":

- All three PRs merged.
- `npm run check` green (svelte-check + lint + unit + content:validate + content:proofread:launch).
- `npm run docs:drift` exits 0.
- `npm run test:e2e` green (267 + 42 → est. 290+ unit, 47+ e2e).
- `npm run spec:validate` green.
- PWA: `vite build` + `scripts/verify-dist.mjs` green.
- SPEC.md §11 has three new MEDIUM/LOW rows (one per PR).
- `docs/launch-checklist.md` updated to mark "Agent-sweep launch-gap tasks" complete.

## Sequencing

PR #1 (i18n) and PR #2 (data-layer) can land in parallel. PR #3 (docs + SW) merges
last because it depends on the new test baseline numbers.

```
PR #1 ──┐
        ├──> PR #3 (after #1 + #2 update test counts)
PR #2 ──┘
```

If anything slips, PR #3 can merge independently (docs drift + SW update are orthogonal
to the rest).

## Risks

- **PR #2 — Tx refactor.** Changing `saveSettings` and `recordReview` touches hot paths.
  Mitigation: existing tests cover both; add concurrency + atomicity tests; review
  via `pwa-data-reviewer` subagent.
- **PR #3 — SW update toast.** Adding a refresh prompt could feel coercive if not
  designed carefully. Mitigation: non-blocking, dismissable, NEVER auto-reloads.
  Honors invariant 6 (non-coercive gamification).
- **PR #1 — i18n translation quality.** Translations should be human-quality. Mitigation:
  use Hindi as the canonical reference (per existing pattern in `docs/i18n-pending.md`);
  copy idiomatic patterns from the existing `hi.json`; treat the PR as content draft
  not final-copy.

## What this does NOT solve

The four human-only M2 launch blockers remain after the sweep:

1. Native-speaker proofread of A1/A2 (invariant 5).
2. Android signing keystore + Play Console account.
3. Vercel project linking + privacy-policy URL.
4. iOS packaging (no macOS).

The sweep is the agent-sweep half of the M2 launch checklist. The user retains the
human-only half.
