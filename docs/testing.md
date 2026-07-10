# FrenchPath — Testing & Regression Guide

This document describes the full test suite, end-to-end user workflows, security regression
coverage, and what was implemented in the **regression test expansion** (June 2026). Use it
when adding features, reviewing PRs, or preparing a release.

**Quick run** (from `frenchpath/`):

```bash
npm run check && npm run lint
npm run test:unit -- --run    # 188 unit tests
npm run test:e2e              # 35 Playwright scenarios (build + preview first)
npm run content:proofread:launch  # A1/A2 launch gate only
```

---

## 1. Test architecture

FrenchPath uses a **domain-logic-heavy unit layer** plus **journey-based E2E** tests. There are
no Svelte component unit tests today; UI regressions are caught by Playwright `data-testid`
selectors and accessibility checks.

```
┌─────────────────────────────────────────────────────────────┐
│  Playwright E2E (35) — production preview on :4173           │
│  app · backup · progression · checkpoint · gloss · hints · … │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Vitest unit (188) — Node env + fake-indexeddb             │
│  db · pwa/backup · srs · lesson · gamification · security   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  CI content gates — content:validate · content:proofread:launch (A1/A2) │
│  Full content:proofread (58 units) — CI report only (continue-on-error) │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Tool | Config | Count |
|-------|------|--------|-------|
| Unit | Vitest 4 | `vite.config.ts` → `test.projects[server]` | **188** tests in **35** `*.spec.ts` files |
| E2E | Playwright | `playwright.config.ts` → `**/*.e2e.ts` | **35** scenarios in **13** files + `helpers.ts` |
| Setup | `fake-indexeddb` | `src/tests/setup.ts` | Polyfills IndexedDB in Node |

E2E always runs against a **production build** (`npm run build && npm run preview` on port 4173),
matching real PWA/service-worker behaviour.

### Content gates (CI)

| Command | Scope | Blocks merge? |
|---------|-------|-----------------|
| `content:validate` | All 52 units | Yes |
| `content:proofread:launch` | A1/A2 only | Yes |
| `content:proofread` | All 52 units | No — informational report for B1–C1 template flags |

See [content-curation.md](./content-curation.md) for launch vs full proofread and the B1–C1 curation workflow.

---

## Performance baseline

Measure bundle and precache size after substantive frontend changes:

```bash
cd frenchpath
npm run analyze          # writes build/stats.html (gzip sizes)
npm run build            # note precache entry count in build log
```

**Baseline (June 2026, post performance pass):**

| Metric | Value |
|--------|-------|
| PWA precache (install) | ~112 entries / ~1.8 MiB (full app + lesson chunks) |
| Home route chunk (`nodes/2`) | ~5.2 KiB gzip |
| `vendor-3d` chunk | Isolated via `manualChunks`; celebration lazy-loads it |
| Lazy chunks | Runtime `CacheFirst` on `/_app/immutable/chunks/` after first visit |
| Home IDB reads | Parallel `Promise.all` batch |

Re-run `npm run analyze` after bundle changes and compare `build/stats.html`.

---

## 2. End-to-end user workflows

Reference apps used when designing journeys: **Duolingo** (path + streak + daily goal),
**Anki** (FSRS review + portable backup), **Memrise** (vocab cards), **Babbel** (CEFR units +
exam prep).

### 2.1 First visit → onboarded learner

| Step | Route / action | Data mutation |
|------|----------------|---------------|
| 1 | Load `/` — PWA shell, service worker registers | — |
| 2 | `settings.onboarded === false` → `Onboarding.svelte` | — |
| 3 | Tap onboarding CTA | `settings.onboarded = true`, `ensurePersistence()` |
| 4 | Home loads path map, streak, due count, unit cards | Read from IndexedDB |

**E2E:** onboarding dismissed in `gotoHome()` helper; reset flow asserts onboarding returns.

### 2.2 Complete a lesson

| Step | Action | Data mutation |
|------|--------|---------------|
| 1 | Tap available unit → `/learn/[unitId]` | — |
| 2 | Lock check (`isUnitLocked`) | — |
| 3 | Intro (bridge markdown, vocab, RecordCompare) | — |
| 4 | Exercise loop: answer → Check → feedback → Continue | — |
| 5 | Last exercise → `completeLesson()` | `progress`, `srsCards` (seed), `stats`, `streak`, `skillProfile` (if score ≥ 60%) |
| 6 | Summary + “Review now” CTA | `ensurePersistence()` |

**Invariants tested:**

- XP awarded only on **improvement delta** (`bestCorrect`) — replay shows “no new XP”
- SRS cards seeded once per vocab item (idempotent on replay)
- Skill profiles **not** updated when score &lt; 60%

**E2E:** `app.e2e.ts` (complete lesson, persistence reload, SRS review, replay anti-farm).

### 2.3 FSRS review session

| Step | Action | Data mutation |
|------|--------|---------------|
| 1 | Home due badge or `/review` | — |
| 2 | `getReviewQueue(20)` — cap 20 cards/session | — |
| 3 | Reveal → grade (again / hard / good / easy) | — |
| 4 | `recordReview()` | `srsCards`, `reviewLog` (append), `stats` (+5 XP), `streak` |

**E2E:** `app.e2e.ts` (review grading), `review.e2e.ts` (empty state, due badge).

### 2.4 Progress dashboard

| Step | Route | Reads |
|------|-------|-------|
| 1 | `/progress` | streak, today XP, completed lessons, due forecast, 7-day chart, skill bars |

**E2E:** CSP smoke visit only (`app.e2e.ts`); metrics not yet asserted in E2E.

### 2.5 Settings, backup, reset

| Step | Action | Data mutation |
|------|--------|---------------|
| 1 | Change language / theme / retention / daily goal / reduce motion | `settings` |
| 2 | **Export backup** | Download JSON with SHA-256 checksum; `localStorage` last-export timestamp |
| 3 | **Import backup** | Preview → confirm → validate → **then** clear all 7 stores + write |
| 4 | **Reset all progress** | `deleteDB('frenchpath')` → reload |

**Backup import order (validate-before-destroy):**

1. `assertBackupSize` (≤ 5 MB)
2. `JSON.parse` (syntax)
3. Version check (`1` or `2`)
4. Checksum verify (v2 only)
5. `migrateBackup()` (v1 → v2)
6. `backupFileSchema.safeParse()` (strict Zod)
7. **Only then:** single readwrite transaction → `clear()` all stores → `put()` validated records

**E2E:** `backup.e2e.ts` (round-trip, corrupt import, export timestamp, reset → onboarding).

### 2.6 Mock DELF A2

| Step | Action | Data mutation |
|------|--------|---------------|
| 1 | DELF card on home (any A2 unit completed) | — |
| 2 | `/exam/delf-a2` — 4 skills, 25 sections | — |
| 3 | Objective sections auto-graded; productive self-assessed | — |
| 4 | `scoreExam()` → result | `recordDailyActivity()` only — no progress/SRS writes |

**E2E:** `app.e2e.ts` (full exam run); unit tests for pass/fail/éliminatoire boundaries.

### 2.7 Offline / PWA

| Step | Action |
|------|--------|
| 1 | SW precaches shell + content chunks |
| 2 | `/learn/[unitId]` via SPA `navigateFallback` |
| 3 | Offline banner when `network.online === false` |
| 4 | IndexedDB works without network |

**E2E:** `app.e2e.ts` (manifest, offline shell).

---

## 3. E2E test inventory

All E2E files live in `frenchpath/e2e/`. Shared helpers: `helpers.ts`.

| File | Scenarios | What it verifies |
|------|-----------|------------------|
| `app.e2e.ts` | 9 | Core happy paths: lesson, persistence, SRS, manifest, offline, DELF exam, **CSP on 9 routes** (incl. mock B1/B2/C1), Hindi UI, **replay XP anti-farm** |
| `backup.e2e.ts` | 5 | Export → reset → import round-trip; corrupt JSON preserves data; last-export UI; reset → onboarding |
| `progression.e2e.ts` | 3 | Locked direct URL; unit-2 unlock after unit-1; DELF hidden pre-A2 |
| `checkpoint.e2e.ts` | 2 | Gate banner after units 1–3; passing g1 unlocks unit 4 |
| `settings.e2e.ts` | 4 | Dark theme; daily goal on home; reduce motion class; data-local notice |
| `review.e2e.ts` | 2 | Empty review state; due badge after lesson |
| `accessibility.e2e.ts` | 2 | Keyboard MCQ path; review grade button focus |
| `onboarding.e2e.ts` | 1 | Full v2 wizard → home path |
| `gloss.e2e.ts` | 2 | Tap-to-gloss in exercises and bridge markdown |
| `hints.e2e.ts` | 1 | Lesson hint decrements and coach note |
| `tts.e2e.ts` | 1 | TTS voice/speed persist after reload |
| `b1-unlock.e2e.ts` | 1 | B1 band visible after A2 milestone |
| `exam-b1.e2e.ts` | 1 | Mock DELF B1 intro → section flow |
| `celebration.e2e.ts` | 1 | Celebration overlay dismiss |

### 3.1 `data-testid` contract

Settings and critical flows use stable test IDs (add new ones when extending E2E):

| Test ID | Location |
|---------|----------|
| `onboarding-start` | `Onboarding.svelte` |
| `unit-card`, `streak-badge`, `daily-goal`, `due-badge`, `delf-card` | Home `+page.svelte` |
| `locked`, `start-lesson`, `check`, `continue`, `summary`, `xp-awarded`, `practice-note` | Lesson `+page.svelte` |
| `reveal`, `review-done`, `no-reviews`, `grade-buttons` | Review `+page.svelte` |
| `language-select`, `theme-select`, `goal-select`, `retention-select`, `reduce-motion` | Settings |
| `backup-export`, `backup-import`, `backup-file-input`, `import-preview`, `import-confirm` | Settings backup |
| `last-export`, `data-local-notice`, `settings-message` | Settings |
| `reset-progress`, `reset-confirm` | Settings danger zone |
| `offline-banner` | `+layout.svelte` |
| Per exercise type | `mcq-option`, `cloze-input`, `text-answer`, etc. |

### 3.2 E2E helpers (`e2e/helpers.ts`)

- `gotoHome(page)` — skip onboarding via IDB for stable flows
- `completeOnboarding(page)` — drive full v2 wizard (tested in `onboarding.e2e.ts`)
- `completeLesson(page)` — drive exercise loop until summary
- `completeCheckpoint(page)` — answer deterministic gate pool and finish checkpoint
- `exportBackupViaSettings(page)` — intercept download, return JSON string
- `importBackupFile(page, json)` — file picker + preview confirm + wait for reload

---

## 4. Unit test inventory

All unit tests use `*.spec.ts` under `src/`. Run subsets by path:

```bash
npm run test:unit -- --run src/lib/pwa
npm run test:unit -- --run src/lib/lesson
```

### 4.1 By domain

| Domain | File(s) | Tests | Covers |
|--------|---------|-------|--------|
| **PWA / backup** | `pwa/backup.spec.ts`, `backupSchema.spec.ts`, `checksum.spec.ts`, `migrations.spec.ts` | 24 | Round-trip, tampered checksum, malformed records, v1 migration, empty/invalid JSON, oversized file, strict schema, concurrent import, preview |
| **Security headers** | `security/headers.spec.ts` | 2 | `vercel.json` + `static/_headers` required headers |
| **Database** | `db/db.spec.ts`, `repositories.spec.ts`, `repositories/reviewLog.spec.ts` | 11 | Settings, SRS index, CRUD, **reviewLog append-only API** |
| **SRS** | `srs/fsrs.spec.ts`, `queue.spec.ts`, `review.spec.ts` | 14 | Scheduling, retention effect, queue cap, due boundary, `recordReview` |
| **Lesson** | `lesson/engine.spec.ts`, `complete.spec.ts`, `progression.spec.ts` | 29 | All 8 exercise types, normalization, XP anti-farm, skill profiles, unlock chain |
| **Gamification** | `gamification/streak.spec.ts`, `activity.spec.ts`, `skillProfileUpdate.spec.ts` | 12 | Streak freezes, daily goal, review+lesson idempotency |
| **Content** | `content/content.spec.ts`, `markdown.spec.ts` | 13 | Zod gate, XSS-safe markdown |
| **Exam** | `exam/score.spec.ts` | 7 | Pass/fail, éliminatoire, boundary scores |
| **Theme** | `theme/apply.spec.ts` | 4 | light/dark/system class application (mocked DOM) |
| **Utils** | `utils/date.spec.ts` | 3 | `todayKey`, `daysBetween` |

### 4.2 Security regression matrix (automated)

| Threat | Unit | E2E | Mitigation |
|--------|------|-----|------------|
| Backup tampering | `backup.spec.ts` | `backup.e2e.ts` | SHA-256 checksum before `clear()` |
| Schema injection | `backupSchema.spec.ts` | corrupt import E2E | Strict Zod + reject unknown keys |
| XSS via content | `markdown.spec.ts` | — | HTML escape before `{@html}` |
| CSP bypass | — | `app.e2e.ts` (6 routes) | Locked `script-src 'self'` |
| DoS via huge import | `backup.spec.ts` | — | `MAX_BACKUP_BYTES` (5 MB) |
| Progress wipe on bad import | `backup.spec.ts` | `backup.e2e.ts` | Validate-before-destroy |
| XP/streak farming | `complete.spec.ts` | replay E2E | `bestCorrect` delta XP |
| HTTP header regression | `headers.spec.ts` | — | CI parses `vercel.json` / `_headers` |
| Review log tampering | `reviewLog.spec.ts` | — | Append-only repository surface |

---

## 5. Implementation details (regression expansion)

### 5.1 Backup hardening (`src/lib/pwa/backup.ts`)

**Added:**

- `MAX_BACKUP_BYTES = 5 * 1024 * 1024` — checked before `JSON.parse`
- `parseBackupJson()` — empty string and syntax errors with safe messages
- `previewBackup()` — async preview for settings UI (checksum + counts, no DB writes)
- `importInFlight` mutex — rejects concurrent destructive imports
- `importBackupInner()` — separated from public `importBackup()` for clarity

**Schema (`backupSchema.ts`):**

- `backupFileSchema.strict()` — rejects unknown top-level keys
- `dailyGoalXp.min(0)`, `progress.score` clamped 0–100

### 5.2 Settings UX (`src/routes/settings/+page.svelte`)

**Added (Anki-style data safety):**

1. **Data-local notice** — “Your learning data exists only on this device”
2. **Last export timestamp** — stored in `localStorage` key `frenchpath:lastExportAt`
3. **Import preview modal** — shows export date, lesson count, card count before replace
4. **File size pre-check** — rejects files &gt; 5 MB before reading text
5. **`role="alert"`** on `settings-message` for screen readers
6. **`data-testid`** on backup export/import, reset, goal, retention, reduce-motion

**Import flow (step by step):**

1. User picks JSON file → `onFile()`
2. `file.size` checked against `MAX_BACKUP_BYTES`
3. `previewBackup(json)` → show `import-preview` dialog
4. User confirms → `importBackup(json)` → full validate → clear+write → `location.reload()`
5. On error → message shown, **existing data untouched**

### 5.3 New test files

| Path | Purpose |
|------|---------|
| `src/lib/security/headers.spec.ts` | CI gate for security headers |
| `src/lib/theme/apply.spec.ts` | Theme class application |
| `src/lib/db/repositories/reviewLog.spec.ts` | Append-only invariant |
| `e2e/helpers.ts` | Shared Playwright utilities |
| `e2e/backup.e2e.ts` | Backup/reset journeys |
| `e2e/progression.e2e.ts` | Unit lock/unlock |
| `e2e/settings.e2e.ts` | Preferences |
| `e2e/review.e2e.ts` | Review queue UX |
| `e2e/accessibility.e2e.ts` | Keyboard/focus |

### 5.4 Extended specs (edge cases)

- **engine:** empty cloze/dictation, Unicode normalization, partial matching, duplicate reorder words
- **complete:** skill profile threshold (60%), no update below threshold
- **activity:** same-day review after lesson (streak idempotent), goal met via reviews only
- **fsrs:** `targetRetention` affects `scheduled_days` for mature cards
- **queue:** card due exactly at `now` included in queue
- **progression:** cross-CEFR unlock (A1-10 → A2-01)
- **score:** exactly 50/100 pass, skill at 5/25 not eliminated
- **markdown:** script injection escaped, nested emphasis documented
- **backup:** truncated JSON, checksum round-trip, unknown keys, concurrent import

---

## 6. How to add tests

### 6.1 New domain logic

1. Add pure function in `src/lib/<domain>/`
2. Create or extend `*.spec.ts` beside the module
3. Use `resetDatabase()` in `beforeEach` when touching IndexedDB
4. Run: `npm run test:unit -- --run src/lib/<domain>`

### 6.2 New UI journey

1. Add `data-testid` to interactive elements (see §3.1)
2. Add scenario to the appropriate `e2e/*.e2e.ts` or create a new file matching `*.e2e.ts`
3. Reuse `helpers.ts` where possible
4. Run: `npm run test:e2e -- --grep "your test name"`

### 6.3 Backup / data-layer changes

1. Read `offline-data-safety` skill and `docs/superpowers/specs/2026-06-08-data-safety-security-retention-hardening-design.md`
2. Never call `clear()` before full validation
3. Add unit tests proving **bad input leaves existing data intact**
4. Run **pwa-data-reviewer** subagent before merge

### 6.4 Security / header changes

1. Update both `vercel.json` and `static/_headers`
2. Extend `headers.spec.ts` if adding required headers
3. Extend CSP E2E route list in `app.e2e.ts` if adding prerendered routes
4. Run **security-review** subagent before merge

---

## 7. Known gaps & deferred

| Area | Status | Notes |
|------|--------|-------|
| Svelte component unit tests | Deferred | Domain logic tested in Node; UI via E2E |
| RecordCompare / microphone | Manual QA | Permissions-Policy tested; E2E mic flaky in CI |
| Progress page metrics E2E | Partial | CSP visit only |
| Service worker update UX | Not tested | No update prompt in product yet |
| Visual regression | Not in scope | Consider Playwright screenshots later |
| v1 backup preview counts | Low risk | Preview shows 0 for legacy flat layout; import still migrates |
| Invalid SRS ISO dates | Low risk | Pass Zod as string; may revive to `Invalid Date` — consider `z.iso.datetime()` |

---

## 9. v2+ UX additions (June 2026)

| Area | Coverage |
|------|----------|
| Checkpoint gates | `gates.spec.ts`, `progression.spec.ts`, `e2e/checkpoint.e2e.ts` |
| Difficulty tiers | `tiers.spec.ts`, `checkpoint.spec.ts`, settings `difficulty-tier-select` |
| Celebrations | `orchestrator.spec.ts`, `e2e/celebration.e2e.ts`, `CelebrationOverlay` testids |
| Onboarding wizard | `e2e/onboarding.e2e.ts`, 7-step flow in `helpers.completeOnboarding()` |
| Share cards | `shareCard.spec.ts`, progress `share-progress` button |
| Glosses on packs | `content.spec.ts` enforces `glosses{}` on all cards |
| Locales | Paraglide `bn`, `ta`, `te`, `kn`, `mr`, `gu`, `pa` message files |

**New E2E files:** `onboarding.e2e.ts`, `checkpoint.e2e.ts`, `celebration.e2e.ts`

**New test IDs:** `checkpoint-node-{gateId}`, `checkpoint-start`, `celebration-overlay`, `celebration-skip`, `difficulty-tier-select`, `assessment-history`, `share-progress`

See [Data sovereignty](./data-sovereignty.md) for learner data model.

---

## 8. Related docs

- [Launch checklist](./launch-checklist.md) — pre-production manual + automated gates
- [Content curation](./content-curation.md) — A1/A2 launch gate vs B1–C1 template curation
- [Data safety spec](./superpowers/specs/2026-06-08-data-safety-security-retention-hardening-design.md)
- [AGENTS.md](../AGENTS.md) — agent routing and skill map
- [frenchpath/README.md](../frenchpath/README.md) — product overview and scripts
