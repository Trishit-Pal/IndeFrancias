# Living Spec System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create FrenchPath's living "mother book" spec (`docs/spec/SPEC.md`) as the single source of truth, with a validator that prevents rot and a workflow-gated `/spec-sync` skill that keeps it accurate as features change.

**Architecture:** One authoritative spine (`SPEC.md`, 11 sections) with the 9 existing docs as linked appendices. A feature-level **Capability Map** ties each capability to its key files + `data-testid`/spec anchors. A `tsx` validator (`npm run spec:validate`) asserts every anchor still resolves. A native Claude Code skill (`.claude/skills/frenchpath-spec-sync/`) + `/spec-sync` command reads the git diff, patches only affected sections, gates invariant/ADR edits behind human sign-off, and logs every change to a revision log.

**Tech Stack:** Markdown (docs + SKILL.md), TypeScript run via `tsx` (validator, matching the existing `content:validate` pattern), Node `fs`/`path`. No new runtime dependencies; nothing ships in the app bundle.

## Global Constraints

- Work happens in `frenchpath/` for code/scripts; specs/docs live in `docs/` at repo root. Run all `npm` commands from `frenchpath/`.
- Conventional commits (`docs:`, `feat:`, `chore:`). **Attribution disabled** — no `Co-Authored-By` trailer (per `git-workflow.md`).
- **Additive only this phase:** create + link; delete nothing; break no existing cross-links.
- The spec's invariants are load-bearing copy — reproduce them **verbatim** from the design doc `docs/superpowers/specs/2026-06-18-living-spec-system-design.md` §3. Do not paraphrase.
- New `tsx` scripts follow the existing `scripts/*.ts` convention; register them in `package.json` `scripts`.
- Nothing in this plan touches `db/`, `srs/`, `lesson/engine.ts`, or `pwa/backup*.ts` **logic** (docs only) — the data-safety invariant is untouched.
- Definition of Done for each task: the task's verification command passes, then commit.

---

### Task 1: Author the SPEC.md spine (narrative sections)

Create the mother book with all 11 section headings and complete content for the narrative sections. The Capability Map (§4) gets a header + schema now and real rows in Task 2; the revision log (§11) gets its header + first entry.

**Files:**
- Create: `docs/spec/SPEC.md`

**Interfaces:**
- Produces: the canonical section headings other tasks/validator depend on — exactly: `## §1 Vision & positioning`, `## §2 Personas, JTBD & decision rule`, `## §3 Invariants (the constitution)`, `## §4 Capability Map`, `## §5 Architecture overview`, `## §6 Domain module index`, `## §7 Decision log (ADR index)`, `## §8 Roadmap & milestones`, `## §9 Glossary`, `## §10 Spec maintenance protocol`, `## §11 Revision log`.

- [ ] **Step 1: Create `docs/spec/SPEC.md` with this exact content**

```markdown
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

## §5 Architecture overview

Static SvelteKit (Svelte 5 runes) PWA → `@sveltejs/adapter-static` (SPA, `200.html` fallback for
Capacitor) → client IndexedDB (`idb`) → pure domain logic (Node-tested) → JSON content packs
(`zod`-validated). FSRS-6 (`ts-fsrs`) for spaced repetition. Paraglide i18n (10 locales). Strict
CSP in `svelte.config.js`. Capacitor 8 wraps the same build for Android/iOS. **No backend.**

Detail: appendix [architecture-map](../architecture-map.md), [mobile-architecture](../product/mobile-architecture.md).

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
```

- [ ] **Step 2: Verify all 11 section headings are present**

Run: `grep -cE "^## §([1-9]|1[01]) " docs/spec/SPEC.md`
Expected: `11`

- [ ] **Step 3: Verify appendix links resolve**

Run (from repo root):
```bash
cd docs/spec && for f in ../product/prd.md ../product/mobile-architecture.md ../product/gtm-launch.md ../architecture-map.md ../data-sovereignty.md ../content-curation.md ../testing.md ../launch-checklist.md; do test -f "$f" && echo "OK $f" || echo "MISSING $f"; done; cd -
```
Expected: every line begins `OK`.

- [ ] **Step 4: Commit**

```bash
git add docs/spec/SPEC.md
git commit -m "docs: add SPEC.md mother-book spine (sections 1-11)"
```

---

### Task 2: Populate §4 Capability Map with real anchors

Replace the empty §4 table with real rows tying capabilities to existing files + testids. The rows below are derived from the current codebase (verified during planning). Then run the validator built in Task 3 — so this task's full verification completes after Task 3; for now, verify file existence manually.

**Files:**
- Modify: `docs/spec/SPEC.md` (§4 table only)

**Interfaces:**
- Consumes: §4 heading + table schema from Task 1.
- Produces: the Capability Map the validator (Task 3) and `/spec-sync` (Task 4) read.

- [ ] **Step 1: Replace the empty §4 table with these rows** (paste under the `|----|...` header row)

```markdown
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
| CAP-I18N | i18n (10 locales) + gloss | shipped | `frenchpath/src/lib/paraglide/`, `frenchpath/messages/` | `language-select`; `e2e/settings.e2e.ts` | prd |
| CAP-SETTINGS | Settings + data-sovereignty panel | shipped | `frenchpath/src/routes/settings/+page.svelte` | `sovereignty-panel`, `reset-progress`, `theme-select`, `reduce-motion`; `e2e/settings.e2e.ts` | data-sovereignty |
| CAP-PROGRESS | Progress / L'Atelier | shipped | `frenchpath/src/routes/progress/+page.svelte` | `xp-chart`, `skill-profile`, `review-forecast`, `assessment-history` | testing |
| CAP-CONTENT | Content packs + schema (A1–C1) | beta (B1–C1) | `frenchpath/src/lib/content/schema.ts`, `frenchpath/src/lib/content/loader.ts`, `frenchpath/src/content/packs/` | `src/lib/content/content.spec.ts` | content-curation |
| CAP-SHARE | Share cards | shipped | `frenchpath/src/lib/share/shareCard.ts` | `share-lesson`, `share-progress`, `share-exam`, `share-review` | prd |
| CAP-PWA | PWA/offline shell + CSP | shipped | `frenchpath/svelte.config.js`, `frenchpath/src/lib/security/` | `offline-banner`; security specs | architecture-map |
| CAP-MOBILE | Capacitor native shell | shipped | `frenchpath/src/lib/platform/shell.ts`, `frenchpath/src/lib/platform/haptics.ts`, `frenchpath/scripts/prepare-cap.mjs` | — | mobile-architecture |
| CAP-SYNC | Optional E2EE sync (prepared) | planned | `frenchpath/src/lib/sync/types.ts` | — | data-sovereignty |
```

- [ ] **Step 2: Spot-check that every Key file path exists** (manual, until the validator lands in Task 3)

Run (from repo root):
```bash
grep -oE '`frenchpath/[^`]+`' docs/spec/SPEC.md | tr -d '`' | sort -u | while read p; do test -e "$p" && echo "OK $p" || echo "MISSING $p"; done
```
Expected: every line begins `OK`. If any path is `MISSING`, fix the row (the file may have moved) — do not invent paths. Note: directory anchors (paths ending `/`) are expected and resolve as directories.

- [ ] **Step 3: Commit**

```bash
git add docs/spec/SPEC.md
git commit -m "docs: populate SPEC.md capability map with real anchors"
```

---

### Task 3: Build the spec validator + reconcile drifted facts + add banners

Create the validator that keeps the Capability Map from rotting, fix the known test-count drift, demote the PRD's SSOT claim, and add the AGENTS.md routing line.

**Files:**
- Create: `frenchpath/scripts/validate-spec.ts`
- Modify: `frenchpath/package.json` (add `spec:validate` script)
- Modify: `docs/spec/SPEC.md` (record true test count in §5/§9 area; add to §11)
- Modify: `docs/product/prd.md` (additive SSOT banner)
- Modify: `AGENTS.md` (routing + DoD line)

**Interfaces:**
- Consumes: §4 Capability Map (Task 2), the 11 section headings (Task 1).
- Produces: `npm run spec:validate` exiting non-zero on any broken anchor/section/link — used by Task 4's skill and Task 6's loop test.

- [ ] **Step 1: Write the validator** `frenchpath/scripts/validate-spec.ts`

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));      // frenchpath/scripts
const frenchpathRoot = resolve(here, '..');                // frenchpath/
const repoRoot = resolve(frenchpathRoot, '..');            // repo root
const specPath = join(repoRoot, 'docs', 'spec', 'SPEC.md');
const specDir = dirname(specPath);

const REQUIRED_SECTIONS = [
  '## §1 Vision & positioning',
  '## §2 Personas, JTBD & decision rule',
  '## §3 Invariants (the constitution)',
  '## §4 Capability Map',
  '## §5 Architecture overview',
  '## §6 Domain module index',
  '## §7 Decision log (ADR index)',
  '## §8 Roadmap & milestones',
  '## §9 Glossary',
  '## §10 Spec maintenance protocol',
  '## §11 Revision log',
];

const errors: string[] = [];
const spec = readFileSync(specPath, 'utf8');

// 1. Required sections present
for (const s of REQUIRED_SECTIONS) {
  if (!spec.includes(s)) errors.push(`Missing section heading: ${s}`);
}

// 2. Capability "Key file" anchors resolve (paths in `frenchpath/...` backticks)
const fileAnchors = [...spec.matchAll(/`(frenchpath\/[^`]+)`/g)].map((m) => m[1]);
for (const rel of [...new Set(fileAnchors)]) {
  if (!existsSync(join(repoRoot, rel))) errors.push(`Capability Key file does not exist: ${rel}`);
}

// 3. Relative markdown links resolve (../ or ./ targets, relative to docs/spec/)
const links = [...spec.matchAll(/\]\((\.\.?\/[^)#]+)(?:#[^)]*)?\)/g)].map((m) => m[1]);
for (const link of [...new Set(links)]) {
  if (!existsSync(resolve(specDir, link))) errors.push(`Broken appendix link: ${link}`);
}

if (errors.length) {
  console.error(`spec:validate FAILED (${errors.length})`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`spec:validate OK — ${REQUIRED_SECTIONS.length} sections, ${new Set(fileAnchors).size} file anchors, ${new Set(links).size} links verified`);
```

- [ ] **Step 2: Register the npm script** in `frenchpath/package.json` (add to `scripts`, after `content:validate`)

```json
		"spec:validate": "tsx scripts/validate-spec.ts",
```

- [ ] **Step 3: Run the validator — expect PASS**

Run (from `frenchpath/`): `npm run spec:validate`
Expected: `spec:validate OK — 11 sections, N file anchors, M links verified`. If it reports MISSING anchors, fix the offending §4 row (do not weaken the validator).

- [ ] **Step 4: Get the true test counts and reconcile the drift**

Run (from `frenchpath/`):
```bash
npx vitest run 2>&1 | tail -5
npx playwright test --list 2>&1 | tail -3
```
Record the real totals. In `docs/spec/SPEC.md` §5, append a sentence: `Test baseline: <U> unit + <E> e2e green.` (use the actual `<U>`/`<E>` from the commands). Add a §11 row: `| 2026-06-18 | Reconciled test-count drift to ground truth | §5 | LOW |`.

- [ ] **Step 5: Add the additive SSOT banner to the PRD** — insert at `docs/product/prd.md` line 2 (right under the H1), before the existing `> Single source of truth...` line:

```markdown
> ⬆️ **The authoritative spec is now [`docs/spec/SPEC.md`](../spec/SPEC.md).** This PRD is a
> detailed product-requirements *appendix* to it. If the two disagree, SPEC.md wins.
```

- [ ] **Step 6: Add the routing line to `AGENTS.md`** — under the "Skill routing" table, add a row, and under "Non-negotiables" add the DoD line:

Add this table row (after the existing rows):
```markdown
| Spec sync (mother book) | `frenchpath-spec-sync` (`.claude/skills/`) | `/spec-sync` (DoD step) |
```
Add this non-negotiable bullet:
```markdown
- **Spec is living** — updating `docs/spec/SPEC.md` via `/spec-sync` is part of Definition of Done; run `npm run spec:validate` after spec edits.
```

- [ ] **Step 7: Run validator again + commit**

Run (from `frenchpath/`): `npm run spec:validate`
Expected: PASS.
```bash
git add frenchpath/scripts/validate-spec.ts frenchpath/package.json docs/spec/SPEC.md docs/product/prd.md AGENTS.md
git commit -m "feat: add spec validator; reconcile drift; demote PRD to appendix"
```

---

### Task 4: Build the frenchpath-spec-sync skill + /spec-sync command

Author the skill that performs diff-scoped spec updates with severity gating, and the slash command that invokes it.

**Files:**
- Create: `.claude/skills/frenchpath-spec-sync/SKILL.md`
- Create: `.claude/skills/frenchpath-spec-sync/LEARNINGS.md`
- Create: `.claude/commands/spec-sync.md`

**Interfaces:**
- Consumes: `SPEC.md` §4 anchors + §10 protocol; `npm run spec:validate`.
- Produces: the `/spec-sync` workflow used as the DoD step in every future feature.

- [ ] **Step 1: Write `.claude/skills/frenchpath-spec-sync/SKILL.md`**

````markdown
---
name: frenchpath-spec-sync
description: Use as the final Definition-of-Done step after finishing a FrenchPath feature, or on demand, to update docs/spec/SPEC.md to reflect code changes. Reads the git diff, patches only affected sections, gates invariant/ADR edits behind human sign-off, logs every change.
---

# FrenchPath Spec Sync

Keep `docs/spec/SPEC.md` (the mother book) accurate after code changes — surgically and cheaply.

## When to use

- The last step of finishing a feature (Definition of Done), or when the user runs `/spec-sync`.
- NOT for trivial diffs that change no capability, behaviour, architecture, or roadmap — say so and stop.

## Procedure

1. **Get the diff.** `git diff --stat` and `git diff` for the working tree (or `git diff <base>...HEAD` on a branch). If empty, report "no changes" and stop.
2. **Map files → sections.** For each changed path, find the §4 Capability Map row whose Key files contain it. A changed file with no row may be a NEW capability (add a row) or internal-only (skip). List your file→section mapping before editing.
3. **Classify severity (see §10 of SPEC.md):**
   - **HIGH** — diff touches anything described by §3 Invariants or §7 ADRs (e.g., adds a network call, an account, runtime AI, weakens CSP, changes an ADR). **STOP. Do not edit those sections. Summarise the conflict and ask the user for explicit sign-off** before proceeding.
   - **MEDIUM** — new/changed capability or roadmap item (§4/§8). Patch the affected section(s) only.
   - **LOW** — wording/glossary. Patch + log.
4. **Patch surgically.** Edit only the mapped sections. Preserve every other line. Keep Capability Map columns intact; update `Status`/`Key files`/`Proof` as the diff dictates.
5. **Log.** Append one row to §11 Revision log: `| <date> | <one-line summary> | <sections> | <severity> |`. Use the date the user/runtime provides; never invent one.
6. **Validate.** Run `npm run spec:validate` from `frenchpath/`. If it fails, fix the anchors you wrote. Then report the sections changed.

## Token economy (mandatory)

- Read the diff and the affected SPEC.md sections only — **never re-read the whole codebase.**
- Default to patching inline in the current context.
- **Escalate to a `doc-updater` subagent ONLY** when the diff is large/milestone-sized (a new domain or route, a new capability, or many files across domains). Pass the subagent the diff + the relevant SPEC.md sections, not the repo.

## Knowledge accrual

When you learn something durable about this repo while syncing (a recurring mapping, a gotcha),
append a dated bullet to `LEARNINGS.md` in this skill folder. Do NOT rewrite this SKILL.md inline —
durable learnings are folded in (with review) at milestone boundaries, then pruned from LEARNINGS.

## Red flags (stop and ask)

- The diff weakens an invariant (adds network/account/runtime-AI, loosens CSP). → HIGH, sign-off required.
- You can't map a change to any section and it clearly affects behaviour. → ask the user where it belongs.
- `spec:validate` fails after your edit and you can't see why. → report, don't force.
````

- [ ] **Step 2: Write the seed `.claude/skills/frenchpath-spec-sync/LEARNINGS.md`**

```markdown
# frenchpath-spec-sync — Learnings

> Append-only log of durable, repo-specific learnings discovered while syncing the spec.
> Folded into SKILL.md (with review) at milestone boundaries, then pruned.

- 2026-06-18 — Seeded. Capability Map is the file→section index; `data-testid`s in §4 mirror the
  e2e contract in `frenchpath/e2e/*` and `docs/testing.md`.
```

- [ ] **Step 3: Write the `/spec-sync` command** `.claude/commands/spec-sync.md`

```markdown
---
description: Update docs/spec/SPEC.md (the mother book) to reflect the current code changes, with severity gating and validation.
---

Invoke the `frenchpath-spec-sync` skill and follow it exactly for the current git diff.

After syncing: report (1) the file→section mapping you used, (2) the sections you changed,
(3) the severity, and (4) the `npm run spec:validate` result. If any change is HIGH severity
(touches an invariant or ADR), STOP before editing and ask me for explicit sign-off.
```

- [ ] **Step 4: Verify the skill files are well-formed**

Run (from repo root):
```bash
test -f .claude/skills/frenchpath-spec-sync/SKILL.md && head -1 .claude/skills/frenchpath-spec-sync/SKILL.md && test -f .claude/commands/spec-sync.md && echo "command OK" && test -f .claude/skills/frenchpath-spec-sync/LEARNINGS.md && echo "learnings OK"
```
Expected: `---` (frontmatter start), `command OK`, `learnings OK`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/frenchpath-spec-sync/ .claude/commands/spec-sync.md
git commit -m "feat: add frenchpath-spec-sync skill + /spec-sync command"
```

---

### Task 5: Document the knowledge-accrual loop + memory pointer

Make "skills improve over time" concrete and discoverable, and add a memory pointer so future sessions know the mother book exists.

**Files:**
- Modify: `docs/spec/SPEC.md` (§10 already references accrual; add a one-line "milestone distill" checklist pointer)
- Create: `C:\Users\trish\.claude\projects\C--Users-trish-OneDrive-Desktop-Projects-IndeFrancias\memory\frenchpath-spec-mother-book.md`
- Modify: `C:\Users\trish\.claude\projects\C--Users-trish-OneDrive-Desktop-Projects-IndeFrancias\memory\MEMORY.md`

**Interfaces:**
- Consumes: SPEC.md §10, skill `LEARNINGS.md` convention (Task 4).
- Produces: a cross-session memory pointer; a milestone distill checklist.

- [ ] **Step 1: Add the milestone-distill checklist to SPEC.md §10** (append under §10):

```markdown
**Milestone distill checklist (run at each milestone close):**
1. Review each skill's `LEARNINGS.md`; fold durable, repeatable learnings into the SKILL.md body.
2. Prune folded entries from `LEARNINGS.md`.
3. Update §8 (mark the milestone done, surface the next) and append a §11 row.
4. Run `npm run spec:validate`.
```

- [ ] **Step 2: Create the memory file** `...\memory\frenchpath-spec-mother-book.md`

```markdown
---
name: frenchpath-spec-mother-book
description: FrenchPath's single source of truth is docs/spec/SPEC.md; kept in sync via /spec-sync as a DoD step.
metadata:
  type: project
---

`docs/spec/SPEC.md` is FrenchPath's living "mother book" — the single source of truth (the PRD is
now a linked appendix). Its §4 Capability Map ties each feature to files + `data-testid`/spec
anchors; `npm run spec:validate` (from `frenchpath/`) asserts the anchors resolve. Updating the
spec is part of Definition of Done, performed by the `frenchpath-spec-sync` skill / `/spec-sync`
command, with HIGH-severity sign-off required for edits touching §3 invariants or §7 ADRs.
Related: [[frenchpath-project]], [[frenchpath-mobile-capacitor]].
```

- [ ] **Step 3: Add the index line to MEMORY.md** (append under the existing list):

```markdown
- [FrenchPath mother-book spec](frenchpath-spec-mother-book.md) — docs/spec/SPEC.md is the SSOT; sync via /spec-sync (DoD), validate via `npm run spec:validate`.
```

- [ ] **Step 4: Validate + commit** (memory files are outside the repo; commit only the repo file)

Run (from `frenchpath/`): `npm run spec:validate`
Expected: PASS.
```bash
git add docs/spec/SPEC.md
git commit -m "docs: add milestone-distill checklist to spec maintenance protocol"
```

---

### Task 6: Validate the full loop end-to-end

Prove the system works: a no-op diff produces no spurious edits, and a real small change patches exactly the right section + logs it.

**Files:**
- (No new files; exercises the skill + validator.)

**Interfaces:**
- Consumes: everything from Tasks 1–5.

- [ ] **Step 1: No-op test** — with a clean working tree (`git status` clean), invoke `/spec-sync`.
Expected: it reports "no changes" and makes **no edits**. If it edits anything, the trigger logic is wrong — fix the SKILL.md procedure step 1.

- [ ] **Step 2: Real-change test** — make a tiny real capability change to verify mapping. For example, add a `data-testid="practice-note"` reference to CAP-LESSON's Proof column is already present; instead simulate by changing a Proof anchor: temporarily append ` (verified)` to the CAP-EX row's Proof cell via a normal edit, stage nothing, then run `/spec-sync`.
Expected: the skill maps the change to §4 CAP-EX, classifies MEDIUM, and appends a §11 row. Confirm no other section changed (`git diff docs/spec/SPEC.md`).

- [ ] **Step 3: Severity-gate test (dry, no real change)** — ask `/spec-sync` to evaluate a hypothetical diff that "adds a fetch() call to a cloud API in src/lib/sync/". 
Expected: it classifies **HIGH** (violates invariant 1/2/4), STOPS, and asks for sign-off instead of editing §3. This confirms the guardrail.

- [ ] **Step 4: Revert the simulation + final validate**

```bash
git checkout -- docs/spec/SPEC.md   # drop the Step 2 simulation edit
cd frenchpath && npm run spec:validate && cd ..
```
Expected: clean tree, `spec:validate OK`.

- [ ] **Step 5: Commit (if any intended doc refinements came out of the loop test)**

```bash
git add -A docs/spec/
git commit -m "test: validate spec-sync loop (no-op, mapping, severity gate)" || echo "nothing to commit"
```

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-06-18-living-spec-system-design.md` §9 implementation outline):
- ① Author SPEC.md §1–§11 + Capability Map + reconcile drift → Tasks 1, 2, 3 ✓
- ② Additive PRD banner → Task 3 Step 5 ✓
- ③ Build `.claude/skills/frenchpath-spec-sync/` + `/spec-sync` → Task 4 ✓
- ④ Wire knowledge accrual (LEARNINGS.md + milestone distill) → Task 4 Step 2, Task 5 ✓
- ⑤ AGENTS.md routing + DoD line → Task 3 Step 6 ✓
- ⑥ Validate the loop (no-op + real change) → Task 6 ✓
- Severity gating (design §5.3) → SKILL.md (Task 4) + Task 6 Step 3 ✓
- Token economy (design §6) → SKILL.md "Token economy" section ✓

**2. Placeholder scan:** No "TBD/TODO/handle edge cases." The only runtime-derived values are the real test counts (Task 3 Step 4), obtained by an exact command and written verbatim — not a placeholder.

**3. Type/name consistency:** `spec:validate` script name, `frenchpath-spec-sync` skill name, `/spec-sync` command, the 11 `## §N ...` headings, and the `CAP-*` IDs are used identically across Tasks 1–6 and the validator's `REQUIRED_SECTIONS`. The validator's section strings match Task 1 Step 1 headings exactly.

**Note on scope:** This is one cohesive system (spec + validator + sync skill), not independent subsystems, so it stays a single plan. Tasks 1–3 produce a working validated spec on their own; Tasks 4–6 add the automation.
```
