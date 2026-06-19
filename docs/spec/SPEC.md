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
| CAP-PATH | Voyage path / home map | shipped | `frenchpath/src/lib/path/VoyageMap.svelte`, `frenchpath/src/lib/path/PathScene.svelte`, `frenchpath/src/lib/components/PathNode.svelte`, `frenchpath/src/routes/+page.svelte` | `path-scene`, `unit-card`, `streak-badge`, `daily-goal`; `e2e/app.e2e.ts` | architecture-map |
| CAP-LESSON | Lesson runner | shipped | `frenchpath/src/routes/learn/[unitId]/+page.svelte`, `frenchpath/src/lib/lesson/complete.ts` | `start-lesson`, `check`, `feedback`, `continue`, `summary`, `xp-awarded`; `e2e/progression.e2e.ts` | testing |
| CAP-EX | Exercise engine (11 types) | shipped | `frenchpath/src/lib/lesson/engine.ts`, `frenchpath/src/lib/lesson/exercises/` | `mcq-option`, `cloze-input`, `text-answer`, `reorder-answer`, `gender-option`, `reading-option`, `matching-select`; `src/lib/lesson/engine.spec.ts` | testing |
| CAP-GLOSS | Native-language gloss bridges | shipped | `frenchpath/src/lib/content/gloss.ts`, `frenchpath/src/lib/components/GlossPopover.svelte` | `gloss-popover`, `easy-gloss-hint`; `e2e/gloss.e2e.ts` | content-curation |
| CAP-SRS | FSRS-6 spaced repetition | shipped | `frenchpath/src/lib/srs/fsrs.ts`, `frenchpath/src/lib/srs/queue.ts`, `frenchpath/src/lib/srs/review.ts`, `frenchpath/src/lib/srs/optimizer.ts` | `e2e/review.e2e.ts` | architecture-map |
| CAP-REVIEW | Review session | shipped | `frenchpath/src/routes/review/+page.svelte` | `grade-buttons`, `reveal`, `review-done`, `review-summary-accuracy`; `e2e/review.e2e.ts` | testing |
| CAP-CHECK | Checkpoints & gates | shipped | `frenchpath/src/lib/assessment/checkpoint.ts`, `frenchpath/src/lib/lesson/gates.ts`, `frenchpath/src/routes/checkpoint/[groupId]/+page.svelte` | `checkpoint-start`, `checkpoint-check`, `gate-banner`; `e2e/checkpoint.e2e.ts` | testing |
| CAP-EXAM | DELF/DALF mock exams | shipped | `frenchpath/src/lib/exam/score.ts`, `frenchpath/src/lib/exam/MockExamRunner.svelte`, `frenchpath/src/routes/exam/` | `start-exam`, `exam-check`, `exam-result`, `delf-card`, `delf-b1-card`, `delf-b2-card`, `dalf-c1-card`; `e2e/exam-b1.e2e.ts` | prd |
| CAP-GAME | Gamification (streak/XP/skills/badges) | shipped | `frenchpath/src/lib/gamification/streak.ts`, `frenchpath/src/lib/gamification/activity.ts`, `frenchpath/src/lib/gamification/skillProfileUpdate.ts`, `frenchpath/src/lib/gamification/adaptiveSuggestions.ts` | `streak-badge`, `freezes-badge`, `daily-goal`, `xp-float`, `weak-skill-chips` | prd |
| CAP-CELEB | Celebrations | shipped | `frenchpath/src/lib/celebration/orchestrator.ts`, `frenchpath/src/lib/celebration/CelebrationOverlay.svelte` | `celebration-overlay`, `celebration-skip`; `e2e/celebration.e2e.ts` | prd |
| CAP-TTS | TTS + record/compare | shipped | `frenchpath/src/lib/audio/tts.ts`, `frenchpath/src/lib/platform/tts.ts` | `tts-section`, `tts-voice-select`, `tts-speed-slider`; `e2e/tts.e2e.ts` | mobile-architecture |
| CAP-BACKUP | Backup export/import (validate-before-destroy) | shipped | `frenchpath/src/lib/pwa/backup.ts`, `frenchpath/src/lib/pwa/backupSchema.ts`, `frenchpath/src/lib/pwa/checksum.ts`, `frenchpath/src/lib/pwa/migrations.ts`, `frenchpath/src/lib/platform/backup.ts` | `backup-export`, `backup-import`, `import-preview`, `import-confirm`; `e2e/backup.e2e.ts` | data-sovereignty |
| CAP-PERSIST | Persistence guarantee | shipped | `frenchpath/src/lib/pwa/persist.ts` | `data-local-notice` | data-sovereignty |
| CAP-NOTIFY | Revision reminders | shipped | `frenchpath/src/lib/pwa/revisionNotify.ts`, `frenchpath/src/lib/platform/notifications.ts` | `revision-notifications`, `test-notification`; `e2e/settings.e2e.ts` | mobile-architecture |
| CAP-I18N | i18n (10 locales) + gloss | shipped | `frenchpath/messages/`, `frenchpath/project.inlang/settings.json` | `language-select`; `e2e/settings.e2e.ts` | prd |
| CAP-SETTINGS | Settings + data-sovereignty panel | shipped | `frenchpath/src/routes/settings/+page.svelte` | `sovereignty-panel`, `reset-progress`, `theme-select`, `reduce-motion`; `e2e/settings.e2e.ts` | data-sovereignty |
| CAP-PROGRESS | Progress / L'Atelier | shipped | `frenchpath/src/routes/progress/+page.svelte` | `xp-chart`, `skill-profile`, `review-forecast`, `assessment-history` | testing |
| CAP-CONTENT | Content packs + schema (A1–C1) | beta (B1–C1) | `frenchpath/src/lib/content/schema.ts`, `frenchpath/src/lib/content/loader.ts`, `frenchpath/src/content/packs/` | `src/lib/content/content.spec.ts` | content-curation |
| CAP-SHARE | Share cards | shipped | `frenchpath/src/lib/share/shareCard.ts` | `share-lesson`, `share-progress`, `share-exam`, `share-review` | prd |
| CAP-PWA | PWA/offline shell + CSP | shipped | `frenchpath/svelte.config.js`, `frenchpath/src/lib/security/` | `offline-banner`; security specs | architecture-map |
| CAP-MOBILE | Capacitor native shell | shipped | `frenchpath/src/lib/platform/shell.ts`, `frenchpath/src/lib/platform/haptics.ts`, `frenchpath/scripts/prepare-cap.mjs` | — | mobile-architecture |
| CAP-SYNC | Optional E2EE sync (prepared) | planned | `frenchpath/src/lib/sync/types.ts` | — | data-sovereignty |

## §5 Architecture overview

Static SvelteKit (Svelte 5 runes) PWA → `@sveltejs/adapter-static` (SPA, `200.html` fallback for
Capacitor) → client IndexedDB (`idb`) → pure domain logic (Node-tested) → JSON content packs
(`zod`-validated). FSRS-6 (`ts-fsrs`) for spaced repetition. Paraglide i18n (10 locales). Strict
CSP in `svelte.config.js`. Capacitor 8 wraps the same build for Android/iOS. **No backend.**

Detail: appendix [architecture-map](../architecture-map.md), [mobile-architecture](../product/mobile-architecture.md).

**Test baseline:** 188 unit + 35 e2e green (the authoritative count; supersedes any differing
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

- **M1 — Stabilise & merge** `feature/grand-voyage-and-capacitor` (finish Grand Voyage UI +
  Capacitor shell, all gates green, merge to `main`). *Current priority.*
- **M2 — Launch** web PWA + Android + iOS **simultaneously**.
- **M3 — Native-speaker proofread** A1–A2 (satisfies invariant 5 for launch levels).
- **M4 — B1–C1 curation** (beta → production, level by level).
- **Later** — on-device ASR (speaking core); optional E2EE sync (prepared, deferred,
  `src/lib/sync/`); on-device FSRS optimisation (`src/lib/srs/optimizer.ts`).

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

## §11 Revision log

| Date | Change | Sections | Severity |
|---|---|---|---|
| 2026-06-18 | Spec created (mother book established) | all | — |
| 2026-06-18 | Reconciled test-count drift to ground truth (188 unit + 35 e2e) | §5 | LOW |
