# Spec: Data-Safety, Security & Retention-Integrity Hardening

- **Date:** 2026-06-08
- **Status:** Approved (design) — pending spec review, then implementation plan
- **App:** `frenchpath/` (offline-first French-learning PWA; SvelteKit + Svelte 5, IndexedDB, FSRS-6)
- **Branch:** `hardening/data-safety-security-retention`
- **Mode:** Design + plan only. No code is written until this spec and the implementation plan are approved.

## 1. Context

FrenchPath is a no-account, offline-first PWA. All learner data lives on-device in a single
versioned IndexedDB database; there is no server and no backup beyond a manual JSON export.
A prior end-to-end evaluation verified the codebase is strong (66 unit tests, ~94% statement
coverage, types clean, lint clean, no hardcoded secrets, the one `{@html}` path is escape-safe).

This hardening pass addresses the highest-leverage gaps that remain, prioritised
**security and database first, user experience second**. The four areas selected
(`backup integrity + import validation`, `IndexedDB migration framework`, `CSP + security
headers`, `retention-integrity XP/streak`) collapse into **three improvements** because the
backup and migration work share one data-layer theme.

### Grounding facts (verified against current code)

- `src/lib/db/db.ts` already has a versioned `upgrade(db, oldVersion)` handler (`if (oldVersion < 1)`).
  The migration *pattern* exists but is unproven (no `v1 → v2` has ever run) and untested.
- `src/lib/pwa/backup.ts` `importBackup()` runs inside a single idb transaction (so a mid-loop
  throw rolls back atomically), but it casts untrusted JSON with `as` and writes it with **zero
  schema validation**. The real risk is a *well-formed-but-hostile or malformed* backup, not a
  partial wipe.
- `svelte.config.js` / `src/app.html` set **no Content-Security-Policy**.
- `recordDailyActivity` (streak) and XP are granted by `completeLesson` (`complete.ts`), reviews
  (`srs/review.ts`), and the exam (`exam/delf-a2`). Replaying an already-completed lesson
  re-grants full XP (`correct × 10`) and a streak day — the farming vector.

## 2. Goals / Non-goals

**Goals**
- Make backup import safe against untrusted/corrupt input without ever destroying existing data.
- Establish a tested, repeatable IndexedDB migration framework with a cross-version backup story.
- Add a defense-in-depth Content-Security-Policy and security headers, portable to any free static host.
- Close the XP/streak farming loophole while rewarding genuine learning and improvement.
- Leave behind reusable tooling (one skill, one sub-agent) that guards the data layer in future work.

**Non-goals**
- No backend, account system, or cloud sync (the offline/no-account model is intentional).
- No change to the build-time AI content pipeline (stays build-time-only).
- No new paid services. Everything stays on free tiers / in-browser.
- No unrelated refactoring beyond what these three improvements require.

## 3. Improvement ① — Data durability & safe restore (security ∩ database) — TOP PRIORITY

### Problem
`importBackup()` parses untrusted JSON and writes it to IndexedDB with no validation; `exportBackup()`
has no integrity stamp; version handling is hard-equality, so an older backup cannot be restored
after the schema evolves.

### Design
- **New `src/lib/pwa/backupSchema.ts`** — Zod schemas for each store's records (reusing the runtime
  types) plus a `backupFileSchema = { schemaVersion: number, exportedAt: string, checksum: string,
  payload: { settings, progress[], srsCards[], reviewLog[], streak[], stats[], skillProfile[] } }`.
- **`exportBackup()`** stamps `schemaVersion = DB_VERSION` and a `checksum` = SHA-256 (Web Crypto
  `crypto.subtle.digest`) over the canonical-JSON-serialised `payload`.
- **`importBackup()`** new order of operations — *validate before destroy*:
  1. `JSON.parse`
  2. `backupFileSchema.safeParse` → reject on failure with a clear message.
  3. Recompute and verify the checksum → reject on mismatch (tamper/corruption).
  4. Run version migration (`schemaVersion → DB_VERSION`) on the parsed payload (see framework below).
  5. **Only now** open the readwrite transaction, `clear()`, and `put()` the validated records.
  - Invalid input therefore can never reach `clear()`; existing data is preserved on any failure.
- **Migration framework — `src/lib/db/migrations.ts`** — an ordered registry of
  `{ from, to, migrateStructure?(db, tx), migratePayload?(payload) }` steps, consumed by **both**:
  - the idb `upgrade()` in `db.ts` (structural: object stores / indexes), and
  - the backup importer (record-shape: transform an older payload up to the current shape).
  - A simulated `v1 → v2` step is implemented as the first real migration (see Improvement ③,
    which adds the `bestCorrect` field — that is the concrete `v1 → v2`).

### Files
- New: `src/lib/pwa/backupSchema.ts`, `src/lib/db/migrations.ts`,
  `src/lib/pwa/backup.spec.ts` (extend), `src/lib/db/migrations.spec.ts`.
- Modified: `src/lib/pwa/backup.ts`, `src/lib/db/db.ts`, `src/lib/db/schema.ts` (`DB_VERSION → 2`).

### Tests
- Export → import round-trip preserves all stores.
- Tampered checksum is rejected.
- Malformed record is rejected **and** existing data is asserted intact (no clear happened).
- An older-version (`v1`) backup restores successfully via payload migration.
- `v1 → v2` structural migration backfills new fields on existing databases.

## 4. Improvement ② — Defense-in-depth security headers (CSP)

### Problem
No Content-Security-Policy. The current `{@html}` markdown path is escape-safe, but CSP is the
safety net for any *future* injection (a new dependency or a richer content renderer).

### Design
- **`kit.csp` in `svelte.config.js`**, `mode: 'hash'` — SvelteKit injects script/style hashes into
  the prerendered HTML, so this works on **any** free static host (including GitHub Pages) with no
  runtime server. Directives:
  - `default-src 'self'`
  - `script-src 'self'`
  - `connect-src 'self'`
  - `img-src 'self' data:`
  - `style-src 'self' 'unsafe-inline'`  *(documented trade-off — see below)*
  - `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`
  - `manifest-src 'self'`, `worker-src 'self'`
- **Portable `static/_headers`** (honoured by Cloudflare Pages / Netlify free tiers) adding
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy` (disable geolocation/camera/microphone/etc.),
  `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, and HSTS.
  A `vercel.json` `headers` equivalent is documented for Vercel deployments.

### Trade-off (documented, accepted)
`style-src` must retain `'unsafe-inline'`: Svelte scoped styles and inline `style="..."` attributes
(e.g. the daily-goal progress bar `style="width: {goalPercent}%"`) cannot be CSP-hashed, as
`style-src-attr` offers no nonce/hash path for attributes. This is low-risk — the dangerous vector
is *script* injection, and `script-src 'self'` stays fully locked. Documented rather than hidden.

### Verification
- `npm run build` succeeds with CSP enabled.
- A Playwright pass asserts **zero CSP violations** on every route (home, learn, review, progress,
  settings, exam).
- TTS (SpeechSynthesis — no network), the service worker, and the web manifest still function.

## 5. Improvement ③ — Retention-integrity XP / streak (refined, APPROVED)

### Problem
Replaying an already-completed lesson re-grants full XP (`correct × 10`) and a streak day, so the
daily goal and streak are farmable without learning.

### Principle
Align the reward with spaced-repetition science: a finished lesson's ongoing value is its cards in
the **SRS review queue**, so the *daily* faucet is **review**, not re-grinding. Lessons reward only
**new learning** (first pass) and **getting better** (beating your best).

### Rule — one unified formula
Track best correct-count per lesson (`bestCorrect`). On every completion:

```
goalXp = max(0, newCorrect − previousBestCorrect) × XP_PER_CORRECT
bestCorrect = max(previousBestCorrect, newCorrect)
```

- First completion (`previousBestCorrect = 0`) → full XP. (No first-vs-replay branch; it falls out.)
- Replay that beats your best (6/8 → 8/8) → top-up XP for the newly-correct (+20). Encourages
  redoing lessons you did poorly — the desired behavior.
- Replay that does not improve → `0` goal-XP.

**Invariant:** lifetime goal-XP from any single lesson ≤ `total × XP_PER_CORRECT` (one full
completion's worth), no matter how many replays. The "bomb attempt 1, then ace replays" cheese
earns nothing extra, because attempt 1 already paid out and deltas only top up to the same ceiling.

### Streak rule
Streak is credited only by a **qualifying activity today**: a lesson that earned goal-XP (a *new
best*), **or** a graded review (≥1 due card), **or** the exam. A no-improvement replay yields
`goalXp = 0` and does **not** advance the streak on its own. A learner who has mastered everything
keeps their streak the intended way — by reviewing due cards.

### Synergy with Improvement ①
`bestCorrect` is a new additive field on `ProgressRecord`, making it the **first real `v1 → v2`
migration**, defaulting from the existing `score`: `bestCorrect = round(score / 100 × total)`.
Point ③ is therefore the concrete proof that Improvement ①'s migration framework works.

> **Note:** `total` (exercise count) can change if a lesson is edited between content versions, so
> `bestCorrect` is stored as a count and may drift slightly across content edits. Accepted for MVP.

### Honest UI
- New best → `"New best! +N XP"`.
- No-improvement replay → `"Practice complete — no new XP (best: X%). Review your due cards to keep
  your streak →"`, linking to `/review`. Transparent, and it steers toward the core habit.

### Resolved decision
The optional cosmetic **practice-XP floor** (a tiny lifetime-only XP per replay, not counting toward
goal or streak) is **skipped** (YAGNI; the honest UI message covers the feel). Can be added later as
a one-line constant if desired.

### Files
- Modified: `src/lib/lesson/complete.ts`, `src/lib/gamification/activity.ts`,
  `src/lib/db/schema.ts` (`ProgressRecord.bestCorrect`), `src/lib/db/repositories/progress.ts`,
  `src/routes/learn/[unitId]/+page.svelte` (UI message).
- Tests: `src/lib/lesson/complete.spec.ts` (extend), `src/lib/gamification/activity.spec.ts` (new).

### Tests
- First-completion full XP.
- Improvement top-up XP on a new best.
- No-improvement replay = 0 XP **and** streak not advanced by it.
- Bomb-then-ace caps at one full-completion's XP (the invariant).
- A review-only day still advances the streak.
- `v1 → v2` migration backfills `bestCorrect` from `score`.

## 6. Persistent tooling — skill + sub-agent (reusable in `~/.claude`)

Deliberately minimal (YAGNI) — two artifacts that guard this work and future data-layer changes.

- **Skill `offline-data-safety`** (`~/.claude/skills/offline-data-safety/`) — invariants + checklist
  for: IndexedDB migrations (additive, tested, version-bumped), backup/restore (validate-before-
  destroy, checksum, version-negotiate), and CSP for static PWAs (hash mode, the `style-src`
  caveat). Triggers on edits to the data layer.
- **Sub-agent `pwa-data-reviewer`** (`~/.claude/agents/pwa-data-reviewer.md`) — reviews diffs that
  touch `db/`, `backup`, migrations, or CSP against the `offline-data-safety` checklist
  (migration safety, backup round-trip integrity, CSP regressions). This is the sub-agent used to
  gate each implementation phase, and reusable in later sessions.

Ephemeral task agents are used for the build itself; the existing `code-reviewer` / `security-reviewer`
pattern handles the final review gate.

## 7. Free-tier posture

- Checksum via in-browser Web Crypto — free, offline.
- `kit.csp` meta-CSP needs no paid host (works even on GitHub Pages).
- `static/_headers` / `vercel.json` are free-tier features on Cloudflare Pages / Netlify / Vercel.
- No new runtime dependencies beyond what already ships (`zod` is already a dependency).

## 8. Sequencing & phases (security/DB before UX)

1. **Phase 1 — Data durability (①):** migration framework + backup validation/checksum + tests.
2. **Phase 2 — Security headers (②):** `kit.csp` + headers files + CSP-violation verification.
3. **Phase 3 — Retention integrity (③):** `bestCorrect` migration (proves Phase 1) + XP/streak rule
   + UI + tests.
4. **Phase 4 — Tooling:** create `offline-data-safety` skill + `pwa-data-reviewer` sub-agent; run
   the sub-agent over Phases 1–3 as the review gate.

Each phase ends green (unit tests + types + lint) before the next begins.

## 9. Testing strategy

- Unit tests for every pure change (migrations, backup validation, XP formula, streak gating);
  maintain the ≥80% coverage bar (currently ~94%).
- Playwright: extend E2E to assert zero CSP violations per route and an export→import round-trip.
- `npm run check` (types) and `npm run lint` stay clean.

## 10. Risks & trade-offs

| Risk | Mitigation |
|------|------------|
| CSP breaks a route (inline styles, SW, manifest) | `style-src 'unsafe-inline'` retained; Playwright CSP-violation gate before merge. |
| `DB_VERSION` bump corrupts existing on-device data | Migration is additive + tested; `bestCorrect` backfills from `score`; backup/restore as escape hatch. |
| Backup migration logic drifts from DB migration logic | Single shared `migrations.ts` registry consumed by both paths. |
| `bestCorrect` semantics drift if content `total` changes | Accepted for MVP; documented. |
| Over-tooling (speculative skills/agents) | Limited to exactly one skill + one sub-agent that serve these changes. |

## 11. Open items

None blocking. The practice-XP floor decision is resolved (skipped). Host-headers target can be
finalised at deploy time; the portable meta-CSP works regardless.
