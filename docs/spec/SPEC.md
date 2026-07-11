# FrenchPath — Specification (the mother book)

> **Single source of truth** for what FrenchPath is and must do. This spec is *living*: it is
> updated as part of every feature's Definition of Done (see §10). When this spec and any other
> doc disagree, **this spec wins**.
> Status: living. Last revised 2026-06-18.

## §1 Vision & positioning

FrenchPath helps Indian learners go from zero French to a DELF/DALF pass — entirely offline, with
no account, on a phone they already own. It bridges French through the learner's own language
(Hindi/Hinglish + 8 more Indian languages), works 100% offline, owns nothing of the user, and
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
| CAP-ONB | Onboarding wizard | shipped | `frenchpath/src/lib/components/OnboardingWizard.svelte` | `onboarding-wizard`, `onboarding-next`, `native-lang-{lang}`, `goal-{goal}`; `e2e/onboarding.e2e.ts` | prd |
| CAP-PATH | Voyage path / home map | shipped | `frenchpath/src/lib/path/VoyageMap.svelte`, `frenchpath/src/lib/path/PathScene.svelte`, `frenchpath/src/lib/components/PathNode.svelte`, `frenchpath/src/routes/+page.svelte`, `frenchpath/src/lib/components/DailyRitual.svelte`, `frenchpath/src/lib/components/CharacterMira.svelte`, `frenchpath/src/lib/components/CharacterLeo.svelte`, `frenchpath/src/lib/components/CharacterCoco.svelte` | `path-scene`, `unit-card`, `streak-badge`, `daily-goal`; `e2e/app.e2e.ts` | architecture-map |
| CAP-LESSON | Lesson runner | shipped | `frenchpath/src/routes/learn/[unitId]/+page.svelte`, `frenchpath/src/lib/lesson/complete.ts` | `start-lesson`, `check`, `feedback`, `continue`, `summary`, `xp-awarded`; `e2e/progression.e2e.ts` | testing |
| CAP-EX | Exercise engine (12 types incl. speak) | shipped | `frenchpath/src/lib/lesson/engine.ts`, `frenchpath/src/lib/lesson/exercises/`, `frenchpath/src/lib/lesson/rubric.ts` | `mcq-option`, `cloze-input`, `text-answer`, `reorder-answer`, `gender-option`, `reading-option`, `matching-select`, `speak-record`; `src/lib/lesson/engine.spec.ts`, `e2e/rubric.e2e.ts` | testing |
| CAP-GLOSS | Native-language gloss bridges | shipped | `frenchpath/src/lib/content/gloss.ts`, `frenchpath/src/lib/components/GlossPopover.svelte` | `gloss-popover`, `easy-gloss-hint`; `e2e/gloss.e2e.ts` | content-curation |
| CAP-SRS | FSRS-6 spaced repetition + on-device weight optimization | shipped | `frenchpath/src/lib/srs/fsrs.ts`, `frenchpath/src/lib/srs/queue.ts`, `frenchpath/src/lib/srs/review.ts`, `frenchpath/src/lib/srs/optimizer.ts`, `frenchpath/src/lib/srs/optimizer.worker.ts`, `frenchpath/src/lib/srs/trainingSet.ts` | `fsrs-status`, `fsrs-reset`; `e2e/review.e2e.ts`, `e2e/fsrs-status.e2e.ts` | architecture-map |
| CAP-REVIEW | Review session | shipped | `frenchpath/src/routes/review/+page.svelte` | `grade-buttons`, `reveal`, `review-done`, `review-summary-accuracy`; `e2e/review.e2e.ts` | testing |
| CAP-CHECK | Checkpoints & gates | shipped | `frenchpath/src/lib/assessment/checkpoint.ts`, `frenchpath/src/lib/lesson/gates.ts`, `frenchpath/src/routes/checkpoint/[groupId]/+page.svelte` | `checkpoint-start`, `checkpoint-check`, `gate-banner`; `e2e/checkpoint.e2e.ts` | testing |
| CAP-EXAM | DELF/DALF mock exams | shipped | `frenchpath/src/lib/exam/score.ts`, `frenchpath/src/lib/exam/MockExamRunner.svelte`, `frenchpath/src/lib/exam/ExamTimer.svelte`, `frenchpath/src/routes/exam/` | `start-exam`, `exam-check`, `exam-result`, `delf-card`, `delf-b1-card`, `delf-b2-card`, `dalf-c1-card`; `e2e/exam-b1.e2e.ts` | prd |
| CAP-GAME | Gamification (streak/XP/skills/badges) | shipped | `frenchpath/src/lib/gamification/streak.ts`, `frenchpath/src/lib/gamification/activity.ts`, `frenchpath/src/lib/gamification/skillProfileUpdate.ts`, `frenchpath/src/lib/gamification/adaptiveSuggestions.ts`, `frenchpath/src/lib/components/AchievementToast.svelte` | `streak-badge`, `freezes-badge`, `daily-goal`, `xp-float`, `weak-skill-chips` | prd |
| CAP-CELEB | Celebrations | shipped | `frenchpath/src/lib/celebration/orchestrator.ts`, `frenchpath/src/lib/celebration/CelebrationOverlay.svelte` | `celebration-overlay`, `celebration-skip`; `e2e/celebration.e2e.ts` | prd |
| CAP-TTS | TTS + record/compare + shadowing | shipped | `frenchpath/src/lib/audio/tts.ts`, `frenchpath/src/lib/platform/tts.ts`, `frenchpath/src/lib/lesson/ShadowingPlayer.svelte` | `tts-section`, `tts-voice-select`, `tts-speed-slider`, `shadow-toggle`, `shadow-transcript`, `shadow-play`, `shadow-loop`; `e2e/tts.e2e.ts` | mobile-architecture |
| CAP-BACKUP | Backup export/import (validate-before-destroy) | shipped | `frenchpath/src/lib/pwa/backup.ts`, `frenchpath/src/lib/pwa/backupSchema.ts`, `frenchpath/src/lib/pwa/checksum.ts`, `frenchpath/src/lib/pwa/migrations.ts`, `frenchpath/src/lib/platform/backup.ts` | `backup-export`, `backup-import`, `import-preview`, `import-confirm`; `e2e/backup.e2e.ts` | data-sovereignty |
| CAP-PERSIST | Persistence guarantee | shipped | `frenchpath/src/lib/pwa/persist.ts` | `data-local-notice` | data-sovereignty |
| CAP-NOTIFY | Revision reminders | shipped | `frenchpath/src/lib/pwa/revisionNotify.ts`, `frenchpath/src/lib/platform/notifications.ts` | `revision-notifications`, `test-notification`; `e2e/settings.e2e.ts` | mobile-architecture |
| CAP-I18N | i18n (10 locales) + gloss | shipped | `frenchpath/messages/`, `frenchpath/project.inlang/settings.json` | `language-select`; `e2e/settings.e2e.ts` | prd |
| CAP-SETTINGS | Settings + data-sovereignty panel | shipped | `frenchpath/src/routes/settings/+page.svelte` | `sovereignty-panel`, `reset-progress`, `theme-select`, `reduce-motion`, `sync-export`, `sync-import`, `update-check-toggle`; `e2e/settings.e2e.ts`, `e2e/sync.e2e.ts` | data-sovereignty |
| CAP-PROGRESS | Progress / L'Atelier | shipped | `frenchpath/src/routes/progress/+page.svelte` | `xp-chart`, `skill-profile`, `review-forecast`, `assessment-history` | testing |
| CAP-CONTENT | Content packs + schema (A1–C1) + writing-rubric hints | beta (B1–C1) | `frenchpath/src/lib/content/schema.ts`, `frenchpath/src/lib/content/loader.ts`, `frenchpath/src/content/packs/` | `rubric-hint`; `src/lib/content/content.spec.ts`, `src/lib/lesson/rubric.spec.ts` | content-curation |
| CAP-SHARE | Share cards | shipped | `frenchpath/src/lib/share/shareCard.ts` | `share-lesson`, `share-progress`, `share-exam`, `share-review` | prd |
| CAP-PWA | PWA/offline shell + CSP | shipped | `frenchpath/svelte.config.js`, `frenchpath/src/lib/security/` | `offline-banner`; security specs | architecture-map |
| CAP-MOBILE | Capacitor native shell | shipped | `frenchpath/src/lib/platform/shell.ts`, `frenchpath/src/lib/platform/haptics.ts`, `frenchpath/scripts/prepare-cap.mjs`, `docs/android-init.md` | — | mobile-architecture |
| CAP-DESKTOP | Windows desktop shell (Tauri) | beta | `frenchpath/src-tauri/` | — (installer build pending Build Tools install) | — |
| CAP-SYNC | E2EE device-to-device merge sync | shipped | `frenchpath/src/lib/sync/crypto.ts`, `frenchpath/src/lib/sync/mergeFile.ts`, `frenchpath/src/lib/pwa/merge.ts` | `sync-passphrase`, `sync-export`, `sync-import`, `sync-preview`, `sync-confirm`; `src/lib/sync/crypto.spec.ts`, `src/lib/pwa/merge.spec.ts`, `src/lib/sync/mergeFile.spec.ts`, `e2e/sync.e2e.ts` | data-sovereignty |
| CAP-SPEAK | On-device speaking core (ASR via Vosk) | shipped | `frenchpath/src/lib/speech/modelManifest.ts`, `frenchpath/src/lib/speech/modelSource.ts`, `frenchpath/src/lib/speech/asr.ts`, `frenchpath/src/lib/speech/score.ts`, `frenchpath/src/lib/lesson/exercises/SpeakExercise.svelte`, `frenchpath/scripts/fetch-vosk-model.mjs` | `speak-record`, `speak-word-chip`, `speak-download-card`, `speak-fallback`; `src/lib/speech/score.spec.ts`, `src/lib/speech/modelSource.spec.ts`, `e2e/speak.e2e.ts` | data-sovereignty |
| CAP-UPDATE | Opt-in, default-off update check | shipped | `frenchpath/src/lib/platform/updates.ts`, `frenchpath/scripts/emit-version-json.mjs` | `update-check-toggle`, `update-check-now`, `updates-status`; `src/lib/platform/updates.spec.ts`, `e2e/settings.e2e.ts` | data-sovereignty |

## §5 Architecture overview

Static SvelteKit (Svelte 5 runes) PWA → `@sveltejs/adapter-static` (SPA, `200.html` fallback for
Capacitor) → client IndexedDB (`idb`) → pure domain logic (Node-tested) → JSON content packs
(`zod`-validated). FSRS-6 (`ts-fsrs`) for spaced repetition. Paraglide i18n (10 locales). Strict
CSP in `svelte.config.js`. Capacitor 8 wraps the same build for Android/iOS. Tauri v2 wraps the
same build for a Windows desktop shell (beta). **No backend.**

Detail: appendix [architecture-map](../architecture-map.md), [mobile-architecture](../product/mobile-architecture.md).

**Test baseline:** 267 unit + 42 e2e green (the authoritative count; supersedes any differing
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
ADR-5 self-hosted fonts · ADR-6 Le Grand Voyage UI · ADR-7 mobile via Capacitor. An edit touching
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
