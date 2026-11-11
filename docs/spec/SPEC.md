# FrenchPath — Specification (the mother book)

> **Single source of truth** for what FrenchPath is and must do. This spec is *living*: it is
> updated as part of every feature's Definition of Done (see §10). When this spec and any other
> doc disagree, **this spec wins**.
> Status: living. Last revised 2026-11-10.

## §1 Vision & positioning

FrenchPath helps Indian learners go from zero French to a DELF/DALF pass — entirely offline, with
no account, on a phone they already own. It bridges French through the learner's own language
(Hindi and Hinglish, with 7 more Indian languages in beta), works 100% offline, owns nothing of the user, and
targets a real credential (A1→C1 culminating in DELF A2/B1/B2 and DALF C1 mocks).

It is fundamentally a **learning product whose heart is the daily retention loop**; DELF/DALF mocks
are milestones that prove progress, not the product's purpose. Market: **India-first,
expansion-ready** — optimise for India now; keep the architecture/content model so other DELF
markets are addable later without a rewrite.

Full positioning detail: appendix [prd](../product/prd.md), [data-sovereignty](../data-sovereignty.md).

## §2 Personas, JTBD & decision rule

Four equal target personas (no single ranked persona):

| Persona | Job to be done |
|---|---|
| Aanya, 19 — college student | French as a second language / study-abroad |
| Rohan, 27 — PR aspirant | DELF B1/B2 for Canada Express Entry points |
| Meera, 34 — hospitality pro | Conversational + workplace French |
| Privacy-conscious learner | Learn without being tracked |

**Decision rule (how the spec arbitrates feature conflicts):** when features compete, favour
whatever strengthens **the daily learning loop** (daily-goal + streak ritual) **and** the
**free/offline/private** promise — because that serves all four personas at once.

## §3 Invariants (the constitution)

Enforced on every change. An edit that touches this section is **high-severity** (see §10).

1. **On-device only, permanently** — no backend, no account, ever. Any future sync must be
   device-to-device or zero-knowledge E2EE.
2. **Zero runtime AI** — AI drafts content at build time only; the shipped app is 100%
   deterministic.
3. **Free, privacy-first** — an optional one-time *supporter unlock* may come later but must never
   gate core learning or compromise offline/no-account.
4. **Strict `default-src 'self'` CSP** — self-hosted fonts; no runtime external requests.
   **Amendment (M2.6, human-approved):** two narrow, evidence-driven exceptions, both scoped to
   named directives, neither widening `connect-src`/`default-src` to any external origin:
   (a) `worker-src 'self' blob:` and `script-src 'self' 'unsafe-eval'` — required for the on-device
   speech-recognition engine (`vosk-browser`), which spawns its worker from a `blob:` URL and whose
   Emscripten-compiled WASM runtime unconditionally calls `new Function()` during its own startup
   (unrelated to `WebAssembly.instantiate`, which the narrower `wasm-unsafe-eval` does NOT cover —
   proven empirically across three real-CSP test attempts before this was added); (b) exactly two
   user-consented, opt-in, GET-only, same-origin fetches — the speaking-pack model download on web
   (native/desktop ship it bundled) and the opt-in, default-off update-version check — both served
   from the app's own domain, so `connect-src`/`default-src` remain `'self'` with no new origins.
   **Amendment (2026-11-10, human-approved):** (c) `media-src 'self' blob:` and
   `connect-src 'self' blob:` — required so the learner can play back their own recording (an
   in-memory `blob:` the app created) and so the on-device speech engine can read the downloaded,
   hash-verified speaking pack from memory inside its worker. `blob:` URLs can only reference data
   created by this origin; no external origin is added.
5. **Native-speaker proofread is a hard gate** — no AI-authored French ships as *production*
   (non-beta) in a public release until a qualified speaker has proofread that level. A1–A2 first,
   then B1+ in batches; B1–C1 may ship openly as clearly-labelled *beta* until then.
6. **Accessibility + non-coercive gamification** — keyboard operable, `aria-live`, reduce-motion,
   ≥44px targets; gamification motivates but is **never coercive** (no guilt, no fake urgency, no
   dark patterns).
7. **Green-and-synced Definition of Done** — every change ends with `npm run check` (0/0) + lint +
   unit + e2e green **and this spec updated**.

## §4 Capability Map

> The traceability heart. Each capability ties a feature to the code + tests that prove it. The
> validator (`npm run spec:validate`) asserts every Key file path resolves. Status ∈
> {shipped, beta, planned}. *(Rows added in Task 2.)*

| ID | Capability | Status | Key files | Proof (testids / specs) | Appendix |
|----|-----------|--------|-----------|------------------------|----------|
| CAP-ONB | Onboarding wizard | shipped | `frenchpath/src/lib/components/OnboardingWizard.svelte` | `onboarding-wizard`, `onboarding-next`, `native-lang-{lang}`, `goal-{goal}`; `e2e/onboarding.e2e.ts`, `e2e/onboarding.e2e.ts` (hands off into lesson 1) | prd |
| CAP-PATH | Voyage path / home map (Mumbai→Paris hero with streak + daily goal, measured SVG route, code-drawn journey-sky backdrop) | shipped | `frenchpath/src/lib/path/VoyageMap.svelte`, `frenchpath/src/lib/path/JourneySky.svelte`, `frenchpath/src/lib/components/PathNode.svelte`, `frenchpath/src/routes/+page.svelte`, `frenchpath/src/lib/components/DailyRitual.svelte`, `frenchpath/src/lib/components/CharacterMira.svelte`, `frenchpath/src/lib/components/CharacterLeo.svelte`, `frenchpath/src/lib/components/CharacterCoco.svelte`, `frenchpath/e2e/mobile.e2e.ts` | `path-scene`, `unit-card`, `streak-badge`, `daily-goal`; `e2e/app.e2e.ts`, `voyage-hero`, `voyage-next`, `voyage-review-due`, `e2e/mobile.e2e.ts` | architecture-map |
| CAP-LESSON | Lesson runner (exit confirm shared with checkpoints and mock exams, Enter-to-submit, single progress bar, next-lesson action on the summary) | shipped | `frenchpath/src/routes/learn/[unitId]/+page.svelte`, `frenchpath/src/lib/lesson/complete.ts`, `frenchpath/src/lib/components/LessonShell.svelte`, `frenchpath/src/lib/components/ExitGuard.svelte`, `frenchpath/src/lib/components/LessonComplete.svelte` | `start-lesson`, `check`, `feedback`, `continue`, `summary`, `xp-awarded`, `next-lesson`; `e2e/progression.e2e.ts`, `lesson-exit`, `lesson-exit-confirm`, `confidence-pulse`, `e2e/lesson-shell.e2e.ts`, `src/lib/lesson/complete.spec.ts` (one-transaction finish, double-tap awards once, replay leaves SRS cards untouched) | testing |
| CAP-EX | Exercise engine (12 types incl. speak; typed answers fold curly apostrophes and œ/æ) | shipped | `frenchpath/src/lib/lesson/engine.ts`, `frenchpath/src/lib/lesson/exercises/`, `frenchpath/src/lib/lesson/rubric.ts` | `mcq-option`, `cloze-input`, `text-answer`, `reorder-answer`, `gender-option`, `reading-option`, `matching-select`, `speak-record`; `src/lib/lesson/engine.spec.ts`, `e2e/rubric.e2e.ts` | testing |
| CAP-GLOSS | Native-language gloss bridges | shipped | `frenchpath/src/lib/content/gloss.ts`, `frenchpath/src/lib/components/GlossPopover.svelte` | `gloss-popover`, `easy-gloss-hint`; `e2e/gloss.e2e.ts`, `src/lib/content/markdownSegments.spec.ts` (an unmatched `*` in bridge text renders literally and never hangs) | content-curation |
| CAP-SRS | FSRS-6 spaced repetition + on-device weight optimization (per-review-prefix training set, first 64 reviews per card; personal weights from 500+ reviews); contextual 4-choice review (read/listen/type/speak modes, mature-card recall upgrade, leech rescue) | shipped | `frenchpath/src/lib/srs/fsrs.ts`, `frenchpath/src/lib/srs/queue.ts`, `frenchpath/src/lib/srs/review.ts`, `frenchpath/src/lib/srs/optimizer.ts`, `frenchpath/src/lib/srs/optimizer.worker.ts`, `frenchpath/src/lib/srs/trainingSet.ts`, `frenchpath/src/lib/srs/contextCard.ts`, `frenchpath/src/lib/srs/contextGrade.ts`, `frenchpath/src/lib/srs/reviewMode.ts`, `frenchpath/src/lib/srs/caps.ts`, `frenchpath/src/lib/srs/leech.ts`, `frenchpath/src/lib/srs/ContextCard.svelte`, `frenchpath/src/lib/srs/LeechRescue.svelte`, `frenchpath/src/lib/speech/recordAndScore.ts` (shared by review speak mode and CAP-SPEAK), `frenchpath/src/routes/review/+page.svelte` | `fsrs-status`, `fsrs-reset`, `context-card`, `context-choice`, `context-feedback`, `context-sentence`, `continue`, `listen-replay`, `recall-check`, `recall-input`, `speak-answer`, `speak-type-instead`, `leech-rescue`, `leech-got-it`; `e2e/review.e2e.ts`, `e2e/fsrs-status.e2e.ts`, `e2e/review-modes.e2e.ts`, `src/lib/srs/trainingSet.spec.ts` | architecture-map |
| CAP-REVIEW | Review session (load-error state, re-entrant grade guard) | shipped | `frenchpath/src/routes/review/+page.svelte`, `frenchpath/src/lib/srs/onceGate.ts` | `grade-buttons`, `reveal`, `review-done`, `review-summary-accuracy`; `e2e/review.e2e.ts`, `src/lib/srs/onceGate.spec.ts`, `e2e/review-grade.e2e.ts` | testing |
| CAP-CHECK | Checkpoints & gates (unbiased seeded shuffle; a retry after a fail gets a new draw) | shipped | `frenchpath/src/lib/assessment/checkpoint.ts`, `frenchpath/src/lib/utils/seededShuffle.ts` (shared with contextual review), `frenchpath/src/lib/lesson/gates.ts`, `frenchpath/src/routes/checkpoint/[groupId]/+page.svelte` | `checkpoint-start`, `checkpoint-check`, `gate-banner`; `e2e/checkpoint.e2e.ts`, `src/lib/assessment/checkpoint.spec.ts` (once-gated finish, seeded draw) | testing |
| CAP-EXAM | DELF/DALF mock exams (a timeout scores the section in progress; the timer counts wall-clock time, so a suspended tab does not pause it) | shipped | `frenchpath/src/lib/exam/score.ts`, `frenchpath/src/lib/exam/MockExamRunner.svelte`, `frenchpath/src/lib/exam/ExamTimer.svelte`, `frenchpath/src/routes/exam/` | `start-exam`, `exam-check`, `exam-result`, `delf-card`, `delf-b1-card`, `delf-b2-card`, `dalf-c1-card`, `exam-skill-score`, `exam-timer`; `e2e/exam-b1.e2e.ts`, `e2e/exam-timeout.e2e.ts` | prd |
| CAP-GAME | Gamification (streak/XP/skills/badges; shown streak recomputed after idle days; completed units are no longer suggested) + Today coach + weekly postcard | shipped | `frenchpath/src/lib/gamification/streak.ts`, `frenchpath/src/lib/gamification/activity.ts`, `frenchpath/src/lib/gamification/skillProfileUpdate.ts`, `frenchpath/src/lib/gamification/adaptiveSuggestions.ts`, `frenchpath/src/lib/components/XpFloat.svelte`, `frenchpath/src/lib/components/WeakSkillChips.svelte`, `frenchpath/src/lib/gamification/todayPlan.ts`, `frenchpath/src/lib/gamification/TodayCard.svelte`, `frenchpath/src/lib/gamification/weeklyRecap.ts`, `frenchpath/src/lib/gamification/WeeklyPostcard.svelte`, `frenchpath/src/lib/share/shareCard.ts`, `frenchpath/src/routes/progress/+page.svelte` | `streak-badge`, `freezes-badge`, `daily-goal`, `xp-float`, `weak-skill-chips`, `today-card`, `today-start`, `today-hint`, `weekly-postcard`, `share-postcard`; `e2e/today.e2e.ts`, `e2e/postcard.e2e.ts`, `src/lib/gamification/streak.spec.ts` (`effectiveStreak`), `src/lib/gamification/adaptiveSuggestions.spec.ts` | prd |
| CAP-CELEB | Celebrations (CSS only: Coco + confetti; no WebGL) | shipped | `frenchpath/src/lib/celebration/orchestrator.ts`, `frenchpath/src/lib/celebration/CelebrationOverlay.svelte`, `frenchpath/src/lib/celebration/CelebrationScene.svelte` | `celebration-overlay`, `celebration-skip`; `e2e/celebration.e2e.ts` | prd |
| CAP-TTS | TTS + record/compare + shadowing | shipped | `frenchpath/src/lib/audio/tts.ts`, `frenchpath/src/lib/platform/tts.ts`, `frenchpath/src/lib/lesson/ShadowingPlayer.svelte`, `frenchpath/src/lib/audio/RecordCompare.svelte` | `tts-section`, `tts-voice-select`, `tts-speed-slider`, `shadow-toggle`, `shadow-transcript`, `shadow-play`, `shadow-loop`; `e2e/tts.e2e.ts`, `e2e/record-compare.e2e.ts` (mic released on unmount), `e2e/csp-blob.e2e.ts` (blob: playback under the real CSP) | mobile-architecture |
| CAP-BACKUP | Backup export/import (validate-before-destroy, 50 MB limit, one-transaction restore, safety copy first, no auto-reload, review-log ids reassigned on restore, an unknown language falls back to English, export refuses a backup that would fail its own restore check, the preview is locked and cannot be closed while the restore runs, restore-complete notice clears when another file is chosen) | shipped | `frenchpath/src/lib/pwa/backup.ts`, `frenchpath/src/lib/pwa/backupSchema.ts`, `frenchpath/src/lib/pwa/checksum.ts`, `frenchpath/src/lib/pwa/migrations.ts`, `frenchpath/src/lib/platform/backup.ts` | `backup-export`, `backup-import`, `import-preview`, `import-confirm`; `e2e/backup.e2e.ts`, `restore-complete`, `restore-reload`, `import-cancel`; `src/lib/pwa/backup.spec.ts`, `src/lib/pwa/backupSchema.spec.ts` | data-sovereignty |
| CAP-PERSIST | Persistence guarantee + Home backup nudge | shipped | `frenchpath/src/lib/pwa/persist.ts`, `frenchpath/src/routes/+page.svelte` | `data-local-notice`, `backup-nudge` | data-sovereignty |
| CAP-NOTIFY | Revision reminders (at most one per day; service-worker notification on web) | shipped | `frenchpath/src/lib/pwa/revisionNotify.ts`, `frenchpath/src/lib/platform/notifications.ts` | `revision-notifications`, `test-notification`; `e2e/settings.e2e.ts`, `src/lib/pwa/revisionNotify.spec.ts` | mobile-architecture |
| CAP-I18N | i18n (10 locales: en/hi/hinglish full; bn/ta/te/kn/mr/gu/pa labelled beta) + gloss | shipped | `frenchpath/messages/`, `frenchpath/project.inlang/settings.json`, `frenchpath/src/lib/profile/types.ts` | `language-select`; `e2e/settings.e2e.ts`, `src/lib/i18n/localeCoverage.spec.ts` (coverage + placeholder parity) | prd |
| CAP-SETTINGS | Settings + data-sovereignty panel + About (version, feedback, licences) + complete Reset | shipped | `frenchpath/src/routes/settings/+page.svelte`, `frenchpath/src/lib/components/AboutSection.svelte`, `frenchpath/src/lib/pwa/wipeLocalData.ts` | `sovereignty-panel`, `reset-progress`, `theme-select`, `reduce-motion`, `sync-export`, `sync-import`, `update-check-toggle`; `e2e/settings.e2e.ts`, `e2e/sync.e2e.ts`, `settings-message` (sticky feedback strip), `about-section`, `app-version`, `feedback-link`, `privacy-link`, `reset-complete`, `reset-reload`; `src/lib/pwa/wipeLocalData.spec.ts` | data-sovereignty |
| CAP-PRIVACY | Privacy policy page (prerendered; linked from Settings and onboarding) | shipped | `frenchpath/src/routes/privacy/+page.svelte` | `privacy-page`, `privacy-link`, `onboarding-privacy-link`; `e2e/settings.e2e.ts` | data-sovereignty |
| CAP-PROGRESS | Progress / L'Atelier | shipped | `frenchpath/src/routes/progress/+page.svelte` | `xp-chart`, `skill-profile`, `review-forecast`, `assessment-history` | testing |
| CAP-CONTENT | Content packs + schema (A1–C1) + writing-rubric hints | beta (B1–C1) | `frenchpath/src/lib/content/schema.ts`, `frenchpath/src/lib/content/loader.ts`, `frenchpath/src/content/packs/` | `rubric-hint`; `src/lib/content/content.spec.ts`, `src/lib/lesson/rubric.spec.ts` | content-curation |
| CAP-SHARE | Share cards | shipped | `frenchpath/src/lib/share/shareCard.ts` | `share-lesson`, `share-progress`, `share-exam`, `share-review` | prd |
| CAP-PWA | PWA/offline shell + CSP (SPA-shell navigation fallback, Update prompt that never auto-reloads, error page, Vercel rewrites, a banner when the stored database is newer than the app or an update waits on another tab) | shipped | `frenchpath/svelte.config.js`, `frenchpath/src/lib/security/`, `frenchpath/src/lib/db/db.ts`, `frenchpath/src/routes/+layout.svelte`, `frenchpath/vercel.json`, `frenchpath/src/lib/components/UpdateToast.svelte`, `frenchpath/src/routes/+error.svelte`, `frenchpath/src/hooks.client.ts` | `offline-banner`; security specs, `update-toast`, `db-update-banner`, `db-update-reload`; `e2e/deep-link.e2e.ts`, `e2e/error-page.e2e.ts`, `e2e/csp-blob.e2e.ts`, `e2e/db-update.e2e.ts`, `src/lib/db/db.spec.ts` | architecture-map |
| CAP-MOBILE | Capacitor native shell | shipped | `frenchpath/src/lib/platform/shell.ts`, `frenchpath/src/lib/platform/haptics.ts`, `frenchpath/scripts/prepare-cap.mjs`, `docs/android-init.md` | —, status bar follows light/dark theme (`syncNativeStatusBar`) | mobile-architecture |
| CAP-DESKTOP | Windows desktop shell (Tauri) | beta | `frenchpath/src-tauri/`, `frenchpath/scripts/prepare-cap.mjs` | — (installer build pending Build Tools install); boots the `200.html` SPA shell like Capacitor (`beforeBuildCommand` runs `prepare-cap.mjs`), not yet verified on a real Tauri build | — |
| CAP-SYNC | E2EE device-to-device merge sync (earned progress outranks recency: a passed checkpoint beats a later failed attempt and streaks join across devices; files dated more than 24 h ahead are refused; safety copy first, no auto-reload, preview counts replaced items; import reads, merges and writes in one transaction; review XP from two devices on the same day adds up; the preview is locked and cannot be closed while the safety copy is made, and the merge-complete notice clears when another file is chosen) | shipped | `frenchpath/src/lib/sync/crypto.ts`, `frenchpath/src/lib/sync/mergeFile.ts`, `frenchpath/src/lib/pwa/merge.ts` | `sync-passphrase`, `sync-export`, `sync-import`, `sync-preview`, `sync-preview-replaced`, `sync-preview-safety-copy`, `sync-safety-copy-failed`, `sync-confirm`, `sync-confirm-anyway`, `sync-cancel`, `sync-complete`, `sync-reload`; `src/lib/sync/crypto.spec.ts`, `src/lib/pwa/merge.spec.ts`, `src/lib/sync/mergeFile.spec.ts`, `e2e/sync.e2e.ts` | data-sovereignty |
| CAP-SPEAK | On-device speaking core (ASR via Vosk; the model load is retried after a failure) | shipped | `frenchpath/src/lib/speech/modelManifest.ts`, `frenchpath/src/lib/speech/modelSource.ts`, `frenchpath/src/lib/speech/asr.ts`, `frenchpath/src/lib/speech/score.ts`, `frenchpath/src/lib/lesson/exercises/SpeakExercise.svelte`, `frenchpath/scripts/fetch-vosk-model.mjs` | `speak-record`, `speak-word-chip`, `speak-download-card`, `speak-fallback`; `src/lib/speech/score.spec.ts`, `src/lib/speech/modelSource.spec.ts`, `src/lib/speech/asr.spec.ts`, `e2e/speak.e2e.ts`; ASR test stub compiled only into `VITE_E2E=1` builds | data-sovereignty |
| CAP-UPDATE | Opt-in, default-off update check | shipped | `frenchpath/src/lib/platform/updates.ts`, `frenchpath/scripts/emit-version-json.mjs` | `update-check-toggle`, `update-check-now`, `updates-status`; `src/lib/platform/updates.spec.ts`, `e2e/settings.e2e.ts` | data-sovereignty |

## §5 Architecture overview

Static SvelteKit (Svelte 5 runes) PWA → `@sveltejs/adapter-static` (SPA, `200.html` SPA shell for
Capacitor, Tauri, the service worker and Vercel rewrites) → client IndexedDB (`idb`) → pure domain logic (Node-tested) → JSON content packs
(`zod`-validated). FSRS-6 (`ts-fsrs`) for spaced repetition. Paraglide i18n (10 locales). Strict
CSP in `svelte.config.js`. Capacitor 8 wraps the same build for Android/iOS. Tauri v2 wraps the
same build for a Windows desktop shell (beta). **No backend.**

Detail: appendix [architecture-map](../architecture-map.md), [mobile-architecture](../product/mobile-architecture.md).

**Test baseline:** 577 unit + 106 e2e green (3 e2e are conditional skips) (the authoritative count; supersedes any differing
figure in other docs).

## §6 Domain module index

`src/lib/` domains and their authoritative docs:

| Domain | Path | Doc |
|---|---|---|
| Data (IndexedDB) | `frenchpath/src/lib/db/` | [architecture-map](../architecture-map.md), [data-sovereignty](../data-sovereignty.md) |
| Spaced repetition | `frenchpath/src/lib/srs/` | [architecture-map](../architecture-map.md) |
| Lesson engine | `frenchpath/src/lib/lesson/` | [testing](../testing.md) |
| Content | `frenchpath/src/lib/content/` | [content-curation](../content-curation.md) |
| Gamification | `frenchpath/src/lib/gamification/` | [prd](../product/prd.md) |
| Exam | `frenchpath/src/lib/exam/` | [prd](../product/prd.md) |
| PWA/backup | `frenchpath/src/lib/pwa/` | [data-sovereignty](../data-sovereignty.md) |
| Platform (Capacitor) | `frenchpath/src/lib/platform/` | [mobile-architecture](../product/mobile-architecture.md) |

## §7 Decision log (ADR index)

Authoritative ADRs live in [architecture-map](../architecture-map.md#decision-log-adrs):
ADR-1 offline/no-backend · ADR-2 FSRS via ts-fsrs · ADR-3 adapter-static SPA · ADR-4 strict CSP ·
ADR-5 self-hosted fonts · ~~ADR-6 Le Grand Voyage UI~~ (superseded by ADR-8) · ADR-7 mobile via
Capacitor · ADR-8 L'Indigo Express design system · ADR-9 sync merge keeps earned progress. Full ADR
records live in `docs/adr/`. An edit touching
an ADR is **high-severity** (see §10).

## §8 Roadmap & milestones

Milestone-based increments. Each milestone = a spec entry → a plan in
`docs/superpowers/plans/` → a tested increment.

- **M1 — Stabilise & merge** `feature/grand-voyage-and-capacitor` (Grand Voyage UI +
  Capacitor shell). ✅ Code review complete; CRITICAL/HIGH defects fixed (dalfC1 gate bug,
  g6/mA2 afterUnitId collision, backup version-range check, IDB transaction try/catch,
  assessments schema .default([]), revisionNotify type fix, frame-ancestors HTTP header,
  .gitattributes LF enforcement). All automated gates green (189 unit + 35 e2e). ✅ **Merged to
  `main`** (2026-06-27); the remote `feature/grand-voyage-and-capacitor` adds nothing to `main`
  and can be pruned.
- **M2 — Launch** web PWA (Vercel) + Android APK (GitHub Releases direct download) + Windows .exe
  (Tauri, sideload/direct-download, not a store) **simultaneously**. iOS deferred (no macOS).
- **M2.6 — Complete Local Product.** ✅ All 20 tasks merged and reviewed (2026-07-11): writing
  rubric feedback (CAP-CONTENT/CAP-EX), on-device FSRS weight optimization (CAP-SRS), speaking
  core via Vosk ASR + shadowing mode (CAP-SPEAK, CAP-TTS), E2EE device-to-device merge sync
  (CAP-SYNC), opt-in update check (CAP-UPDATE), and packaging/dist verification. Two narrow,
  evidence-driven CSP amendments (invariant 4) and two opt-in same-origin fetches, both
  human-approved — see invariant 4 above. Test baseline 195→256 unit, 35→42 e2e.
- **M3 — Native-speaker proofread** A1–A2 (satisfies invariant 5 for launch levels). Scope now
  **24 units** (A1 12 + A2 12) after the M2.5 content deepening — the 6 new AI-drafted units pass
  the automated `content:proofread:launch` gate but still await human native-speaker sign-off.
- **M4 — B1–C1 curation** (beta → production, level by level).
- **Later** — on-device writing LLM (V2, Transformers.js); Whisper WASM upgrade path for ASR;
  `PathScene3D` (WebGL path ribbon, CSS 2.5D suffices at launch scale); iOS packaging (no macOS
  available).

Launch detail: appendix [gtm-launch](../product/gtm-launch.md), [launch-checklist](../launch-checklist.md).

## §9 Glossary

- **Gloss / bridge** — inline native-language hint for a French word (`src/lib/content/gloss.ts`).
- **Le Grand Voyage** — the Mumbai→Paris journey UI; characters Mira/Léo/Coco.
- **épreuve** — a DELF/DALF exam section (scored /25; pass ≥50/100, ≥5/25 per section).
- **FSRS-6** — the spaced-repetition scheduler (`ts-fsrs`).
- **Checkpoint / gate** — assessment that unlocks the next unit group.
- **Capability** — one tracked feature row in §4.

## §10 Spec maintenance protocol

This spec is kept honest by the `frenchpath-spec-sync` skill + `/spec-sync` command (DoD step).

- **Trigger:** final step of finishing a feature, or run on demand.
- **Mechanism:** read the git diff → match changed files to §4 Capability-Map anchors → patch only
  the affected sections → append a §11 entry. Escalate to a `doc-updater` subagent only for
  large/milestone diffs. Never re-derives the whole repo.
- **Severity gating:** a diff touching **§3 invariants or §7 ADRs is HIGH** → stop and request
  explicit human sign-off before editing. §4/§8 changes are MEDIUM (auto-patch + log). Wording is
  LOW (auto-patch + log).
- **Integrity:** `npm run spec:validate` must pass after any spec edit.
- **Knowledge accrual:** learnings captured continuously (memory + per-skill `LEARNINGS.md`);
  folded into skill files with review at milestone boundaries.

**Milestone distill checklist (run at each milestone close):**
1. Review each skill's `LEARNINGS.md`; fold durable, repeatable learnings into the SKILL.md body.
2. Prune folded entries from `LEARNINGS.md`.
3. Update §8 (mark the milestone done, surface the next) and append a §11 row.
4. Run `npm run spec:validate`.

## §11 Revision log

| Date | Change | Sections | Severity |
|---|---|---|---|
| 2026-06-18 | Spec created (mother book established) | all | — |
| 2026-06-18 | Reconciled test-count drift to ground truth (188 unit + 35 e2e) | §5 | LOW |
| 2026-06-19 | Phase 1 defect fixes: .gitattributes, frame-ancestors HTTP header, capacitor bundle ID confirmed | §8 | LOW |
| 2026-06-19 | Code-review: CRITICAL dalfC1 gate bug (B2→C1), HIGH g6/mA2 afterUnitId collision, backup version range + IDB tx try/catch, assessments .default([]), notify type fix | §8 | MEDIUM |
| 2026-06-20 | spec-sync: tied Le Grand Voyage UI components into §4 Key files — DailyRitual + Mira/Léo/Coco (CAP-PATH), ExamTimer (CAP-EXAM), AchievementToast (CAP-GAME) | §4 | MEDIUM |
| 2026-06-27 | Reconciled M1: work confirmed on `main`, dropped stale "merge pending"; surfaced M2 as current | §8 | MEDIUM |
| 2026-06-27 | CAP-CHECK: completed g6/mA2 collision fix — `buildLockReasonMap` now uses `pendingGateAfterUnit`, so a unit locked solely by the A2 milestone shows its reason (+1 regression test → 189 unit) | §5, §8 | MEDIUM |
| 2026-07-09 | M2.5: Tauri desktop shell (beta) scaffolded; Android init/signing docs completed; LessonComplete surface + editorial design tokens applied across home/lesson/progress/settings; desktop wide-window layout | §4, §5, §8 | MEDIUM |
| 2026-07-09 | Corrected test-count drift: baseline was stale at 189 vs. actual 192 (3 tests added this milestone: platform desktop-detection ×2, Tauri CSP ×1) | §5 | LOW |
| 2026-07-10 | Pre-launch hardening: hardened Tauri CSP to full web-shell parity (object-src/base-uri/frame-ancestors/worker-src) + drift-proof parity test — **strengthens** invariant 4, no relaxation | §5 | MEDIUM |
| 2026-07-10 | Content deepening: +6 AI-drafted A1/A2 units (24 total, 58 overall); checkpoints restructured (g15 A1 10–12, g16 A2 10–12; mA1/mA2 moved to each level's new last unit); per-level BETA pill on B1–C1 (CAP-CONTENT/CAP-PATH); new units enter the invariant-5 proofread gate | §4, §8 | MEDIUM |
| 2026-07-10 | Test baseline 192→195 (+IndexedDB v1→v2 upgrade-preservation test, +CSP parity test, +A1/A2 gate-restructure test); checkpoint route fully localized across 10 locales; onb_beta translated in 7 Indic locales | §5 | LOW |
| 2026-07-11 | M2.6: invariant 4 amended — `worker-src 'self' blob:` + `script-src 'self' 'unsafe-eval'` for on-device Vosk ASR (empirically proven `wasm-unsafe-eval` insufficient; Emscripten runtime calls `new Function()` unconditionally at init), plus two opt-in same-origin GET fetches (speaking-pack download, update-version check). Human-approved during design and again during implementation when scope exceeded the original design's two-fetch amendment. `connect-src`/`default-src` remain `'self'` throughout — no new external origins. | §3 | HIGH |
| 2026-07-11 | M2.6 milestone complete: CAP-SPEAK, CAP-UPDATE shipped (new rows); CAP-SYNC planned→shipped; CAP-EX 11→12 exercise types (speak); CAP-SRS gains on-device weight optimization (fsrs-browser); CAP-CONTENT gains writing-rubric hints; CAP-TTS gains shadowing mode; CAP-SETTINGS gains sync + update-check UI. Test baseline 195→256 unit, 35→42 e2e. | §4, §5, §8 | MEDIUM |
| 2026-07-11 | M2.6 code-review fixes: elision/hyphen-aware pronunciation scoring (CAP-SPEAK); record double-tap mic-leak guard; shadowing loop-stop fix + `shadow-play`/`shadow-loop` test-ids (CAP-TTS); single shared `validateAndParseBackup` gate for backup+sync import with sync-envelope size guard + tx.abort masking guard (CAP-SYNC); `hintByLang` rubric variants now rendered per learner language (CAP-CONTENT). Test baseline 256→267 unit, 42 e2e. | §4, §5 | LOW |
| 2026-07-14 | "L'Indigo Express" premium UI revamp (visual/design-system only, no capability/behaviour/invariant change). One unified token contract (`tokens.css`) with a complete indigo-night dark theme for every surface (the warm palette previously had no dark variants); Layer-B blue system collapsed to token aliases; soft elevation replaces hard offset shadows. Fonts: Instrument Serif→Fraunces Variable, Manrope static→Manrope Variable (still `@fontsource` self-hosted — invariant 4 intact). New shared primitives: `Icon`+`icons.ts` (inline-SVG icon set replacing emoji nav), `IconButton`, `Modal`, `InfoBanner`. `VoyageMap` rebuilt as an SVG India→Paris route (marigold progress line, landmark medallions, Coco marker, jali texture). Celebrations consolidated onto `CelebrationOverlay` (deleted `AchievementToast`); deleted dead `PathScene`; CAP-PATH/CAP-GAME Key files updated accordingly. `viewport-fit=cover` added; brand icon + PWA assets recoloured. All `data-testid`/aria/copy preserved; test baseline unchanged (267 unit / 42 e2e). | §4, §11 | MEDIUM |
| 2026-11-06 | Indigo Express a11y review fixes (strengthens invariant 6; no capability change). Text-safe tokens `--fp-saffron-text`/`--fp-sage-text`/`--fp-on-error` (accent tokens are fills; text uses `-text`) guarded by `src/lib/theme/contrast.spec.ts` (≥4.5:1, both themes). `Modal` on native `<dialog>`+`showModal()` (focus trap + restore). View transitions honor OS `prefers-reduced-motion`. Shadowing toggle gets distinct `shadow_practice` name (placeholders in `docs/i18n-pending.md`). VoyageMap dotted base route fixed. Design rationale in `docs/adr/0008-indigo-express-design-system.md`. Test baseline 267→282 unit, 42→43 e2e. | §5, §11 | LOW |
| 2026-11-06 | ADR-8 "L'Indigo Express" design system accepted, superseding ADR-6 (user sign-off given). Registered in `architecture-map.md` decision log; full record in `docs/adr/0008-…`. Also de-flaked `app.e2e.ts` zero-improvement-XP test (pins `Math.random` so Matching/Reorder shuffles are identical across runs). | §7, §11 | HIGH (signed off) |
| 2026-11-06 | spec-sync: Today coach + contextual review. CAP-SRS gains contextual 4-choice review (read/listen/type/speak modes, mature-card recall upgrade, leech rescue panel) and shared `recordAndScore` (extracted from SpeakExercise); CAP-GAME gains the Today coach card (`todayPlan`) and weekly postcard recap + share. No network, account, runtime-AI, CSP, schema or dependency change. Test baseline 282/43 -> 363 unit + 56 e2e (clean worktree at e0b30e6). | §4, §5, §11 | MEDIUM |

| 2026-11-07 | UI/UX refinement pass (Operate mode; strengthens invariant 6, no invariant/ADR edit). Verification: `mobile` Playwright project (Pixel 7) + axe WCAG A/AA scans in `e2e/accessibility.e2e.ts` (both projects), PORT-configurable e2e. Tokens: rose-as-text/fill fixed at the token level (`--fp-jaipur-text` backs `--fp-primary`; `--fp-seine-text`, `--fp-ivory`), glass/neon tokens retired, raw hex gone from `layout.css`, Indic UI font cascade moved onto `--fp-font-ui` per `html[lang]`. Shell: skip link, route-change focus + announcer, theme-aware native status bar. CAP-LESSON: exit control + `beforeNavigate` guard, Enter-to-submit, one progress bar, i18n chips/hints/play. CAP-PATH: hero (today's stop + next lesson + due link), Mumbai departure stop, pixel-measured SVG route (fixes stray ink at 0%). CAP-REVIEW: load-error + retry, `createOnceGate` double-grade fix. CAP-ONB → lesson 1; CAP-SETTINGS skeleton + sticky feedback; home/review/progress loading & error states; 60+ new message keys (en+hi, placeholders logged). Critique snapshots 26/25/24 in `.impeccable/critique/`; `DESIGN.md` documented. | §4 | MEDIUM |
| 2026-11-07 | Test baseline reconciled after the UI/UX pass: 380 unit (53 files) + 73 e2e (desktop runs all; mobile project re-runs the a11y + mobile specs). | §5 | LOW |
| 2026-11-10 | Invariant 4 amendment (c): blob: in media-src/connect-src for recording playback and web speaking-pack load (owner-approved) | §3 | HIGH |
| 2026-11-10 | Design-critique pass (no invariant/ADR edit). CAP-PATH: journey-sky home backdrop (`JourneySky.svelte`, `--fp-sky-*` tokens guarded by `contrast.spec.ts`), streak + daily goal moved into the voyage hero, single reviews-due link, Coco level from lifetime XP. CAP-LESSON: shared `ExitGuard` now also guards checkpoints and mock exams; summary offers the next unlocked lesson; duplicate lesson-complete overlay removed. CAP-CELEB: Three.js scene replaced by CSS, `three`/`@threlte/*` removed. A11y fixes: flip card under Reduce Motion, evening greeting contrast, reduced-motion iteration cap, 44px targets, `--fp-error-text`, emoji→Icon, 16 strings to Paraglide, Indic type overrides. Test baseline 456 unit + 94 e2e. | §4, §5 | MEDIUM |
| 2026-11-10 | Launch hardening A1–A10 (branch `fix/launch-hardening`; no invariant/ADR text edit beyond the separately logged amendment (c)). CAP-BACKUP: 50 MB limit, compact export, one-transaction restore, safety copy before restore. CAP-LESSON/CAP-CHECK/CAP-SRS: one transaction per finish/review, once-gated finish. CAP-PWA: error page + `handleError` + global error banner, DB reconnect/blocked handling, Vercel rewrites + immutable cache header, SW navigation fallback = `200.html`, `registerType: prompt` with an Update toast (never auto-reloads). CAP-PERSIST: Home backup nudge; `lastExportAt` moved into Settings. CAP-GAME: `effectiveStreak`. CAP-NOTIFY: one reminder per day. CAP-SPEAK: ASR test stub gated behind `VITE_E2E`. CI: actions pinned by SHA, read-only token, advisory `npm audit`, Dependabot, gitleaks, `spec:validate` + `verify:dist` gates. New CAP-PRIVACY; CAP-SETTINGS gains About + complete Reset. CAP-I18N: 7 Indic locales labelled beta, coverage test. CAP-SRS: the training set is now one item per review prefix, so the on-device optimizer produces personal weights for the first time (500+ reviews); fsrs wasm precached. | §1, §4, §5 | MEDIUM |
| 2026-11-10 | Whole-branch review fix wave: CAP-NOTIFY reminders via the service-worker registration (the constructor throws on Android Chrome); CAP-TTS `RecordCompare` releases the mic on unmount; CAP-BACKUP restore no longer reloads (calm message + Reload button, so the safety-copy download can finish); CAP-DESKTOP boots the `200.html` shell (unverified on a real Tauri build); Reset while offline keeps the precache + SW; stale Three.js licence entry removed; placeholder-parity check; CI job timeouts. | §4 | MEDIUM |
| 2026-11-10 | Test baseline reconciled at `53821e7`: 473 unit + 95 e2e (92 passed, 3 conditional skips). | §5 | LOW |
| 2026-11-11 | Pre-launch review fixes (branch `worktree-fix-launch-review-findings`; no invariant or ADR text edit). CAP-SYNC: a passed checkpoint beats a later failed attempt; streaks join across devices (zero-XP lesson replays do not count as streak days); sync files dated more than 24 h ahead are refused; import takes a safety copy first, never auto-reloads, locks the preview while importing, and its preview counts replaced items. CAP-EX: typed answers fold curly apostrophes and œ/æ. CAP-GLOSS: the bridge-text parser no longer hangs on an unmatched `*`. CAP-EXAM: a timed-out mock exam scores the section in progress. CAP-BACKUP: review-log ids are reassigned on restore; an unknown language falls back to English. Test baseline 473→537 unit, 95→100 e2e (97 passed, 3 conditional skips). | §4, §5 | MEDIUM |
| 2026-11-11 | ADR-9 "Sync merge keeps earned progress" added (owner-approved): records the merge rules shipped in the pre-launch review fixes; full record in `docs/adr/0009-sync-merge-keeps-progress.md`. No invariant edit. | §7 | HIGH |
| 2026-11-11 | Pre-launch review follow-up (branch `fix/launch-review-mediums`; no invariant or ADR text edit). CAP-SYNC: import reads, merges and writes in one transaction; review XP from two devices on the same day adds up, counting only reviews the other device did not have; two never-active streaks merge to 0; preview uses singular wording for one replaced item, no longer needs an exportable local backup, and clears the merge-complete notice when another file is chosen. CAP-BACKUP: export refuses a backup that would fail its own restore check; the restore preview is locked while the restore runs; the restore-complete notice clears when another file is chosen. Shared Modal re-opens itself if the browser closes it while a locked import is running. CAP-PWA: a banner when the stored database is newer than the app or an update waits on another tab. CAP-EXAM: the timer counts wall-clock time, so a suspended tab does not pause it. CAP-CHECK: unbiased seeded shuffle, new draw on retry (shared `seededShuffle.ts`). CAP-SPEAK: the speech model load is retried after a failure. CAP-GAME: completed units are no longer suggested on Home. CI: the build fails on high or critical advisories in `dependencies`; routine audit fixes applied to the lockfile (no capability row). Test baseline 537→577 unit, 100→106 e2e (103 passed, 3 conditional skips). | §4, §5 | MEDIUM |
| 2026-11-11 | ADR-9 amended (owner-approved): review findings M2 and M3 recorded as fixed; the cross-time-zone limit of the same-day review count added to its known limits, and its streak options table qualified to match. Full record in `docs/adr/0009-sync-merge-keeps-progress.md`. No invariant edit. | §7 | HIGH |
