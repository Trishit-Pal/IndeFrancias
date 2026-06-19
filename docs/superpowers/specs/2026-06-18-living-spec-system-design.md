# Living Spec System ("the mother book") — Design

> Design doc for FrenchPath's single-source-of-truth spec and its auto-update mechanism.
> Status: **approved** (brainstorm, 2026-06-18). Next step: `writing-plans` → implementation.
> Author session: spec-driven-development brainstorm. Supersedes nothing; additive to existing docs.

## 1. Context & problem

FrenchPath already has a rich documentation estate — a PRD (self-titled "single source of
truth"), an architecture-map with 7 ADRs, plus `mobile-architecture`, `gtm-launch`,
`data-sovereignty`, `content-curation`, `ml-roadmap`, `launch-checklist`, and `testing`.
Nine documents, no single authoritative spine, and **two docs implicitly competing to be the
source of truth**. As features land, these drift: nothing forces a doc to change when code does.

We want a **"mother book"** — one authoritative, living product specification suitable for
spec-driven development — that (a) consolidates the existing estate without duplicating it and
(b) **stays accurate automatically** as features are added or changed, recording the exact
changes. All of this under a hard constraint: **optimal token utilisation** (no expensive
re-derivation; spend model tokens only when real work completes).

## 2. Goals / non-goals

**Goals**
- One authoritative spec spine (`docs/spec/SPEC.md`) that arbitrates product decisions.
- Surgical, low-token auto-update tied to the development workflow (Definition of Done).
- Severity-aware safety: changes to invariants/ADRs require human sign-off, not silent edits.
- Skills/agents that accrue knowledge over time without degrading.
- Full additivity this phase: create + link, delete nothing, break no cross-links.

**Non-goals (YAGNI)**
- ❌ Rewriting/merging all 9 docs now (they become linked appendices).
- ❌ A CI doc-drift gate or an automatic Stop/PostToolUse hook (considered and rejected on
  token-economics grounds — see §6 alternatives).
- ❌ Line-level requirement↔code traceability matrix (too heavy for the team size).
- ❌ Auto-rewriting skill files on every run (degrades skills — see §5.4).

## 3. Validated product decisions (interview synthesis)

These are the agreed product truths from the requirements interview; they become the content of
`SPEC.md` §1–§3 and §8. They are recorded here so the spec author has an unambiguous input.

**Identity.** Offline-first, no-account PWA (web + Android + iOS via one Capacitor codebase)
teaching French **A1→C1** to Indian learners. Bridging through **Hindi/native language is a core
conviction**. **India-first, expansion-ready.** Fundamentally a **learning product whose heart is
the daily retention loop**; DELF/DALF mocks are milestones, not the product's purpose.

**Personas.** Keep all four PRD personas (Aanya/Rohan/Meera/privacy-conscious) as targets — no
single ranked persona. Because that cannot arbitrate feature conflicts on its own, the spec adds
an **outcome-based decision rule** (below).

**Decision rule.** When features compete, favour whatever strengthens **the daily learning loop**
(daily-goal + streak ritual) **and** the **free/offline/private** promise — this serves all four
personas at once.

**Invariants (the constitution).** The spec enforces these on every change:
1. **On-device only, permanently** — no backend, no account, ever. Any future sync must be
   device-to-device or zero-knowledge E2EE.
2. **Zero runtime AI** — AI drafts content at build time only; the shipped app is 100%
   deterministic.
3. **Free, privacy-first** — an optional one-time **supporter unlock** may come later but must
   never gate core learning or compromise offline/no-account.
4. **Strict `default-src 'self'` CSP** — self-hosted fonts; no runtime external requests.
5. **Native-speaker proofread is a hard gate** — no AI-authored French ships as *production*
   (non-beta) in a public release until a qualified speaker has proofread that level. A1–A2
   first, then B1+ in batches; B1–C1 may ship openly as clearly-labelled **beta** until then.
6. **Accessibility + non-coercive gamification** — keyboard operable, `aria-live`,
   reduce-motion, ≥44px targets; gamification (streaks/badges/XP/celebrations) motivates but is
   **never coercive** (no guilt, no fake urgency, no dark patterns).
7. **Green-and-synced Definition of Done** — every change ends with `check` 0/0 + lint + 188
   unit + 35 e2e green **and the spec updated**.

**Experience.** North-star daily ritual = **hit the daily goal + keep the streak**. Onboarding =
**guided wizard** (goal + level + bridge language) then first lesson. Tone = **playful gamified
push, kept kind** (per invariant 6). Speaking = **supportive now** (record-and-compare + TTS),
**core later** (on-device ASR is a V1/V2 upgrade).

**Roadmap (milestone-based increments).**
1. **M1 — Stabilise & merge** `feature/grand-voyage-and-capacitor` (finish Grand Voyage UI +
   Capacitor shell, all gates green, merge to `main`). *Current priority.*
2. **M2 — Launch** web PWA + Android + iOS **simultaneously**.
3. **M3 — Native-speaker proofread** A1–A2 (satisfies invariant 5 for launch levels).
4. **M4 — B1–C1 curation** (beta → production, level by level).
5. Later: on-device ASR, optional E2EE sync (prepared, deferred), on-device FSRS optimisation.

## 4. Spec structure — spine + linked appendices

`SPEC.md` is the authoritative spine; the 9 existing docs become its **linked appendices**
(unchanged this phase except an additive banner on the PRD). The PRD's "single source of truth"
claim is demoted: a one-line banner points up to `SPEC.md`; the PRD remains the detailed
product-requirements appendix.

```
docs/spec/SPEC.md            ← the mother book (single source of truth)
  §1  Vision & positioning
  §2  Personas, JTBD & the decision rule
  §3  Invariants (the constitution, §3 above)
  §4  Capability Map         ← the heart: every feature with anchors (see §5)
  §5  Architecture overview
  §6  Domain module index    → links architecture-map, mobile-architecture, …
  §7  Decision log (ADR index) → architecture-map ADR-1..7
  §8  Roadmap & milestones (M1..)
  §9  Glossary (gloss, voyage, épreuve, FSRS, …)
  §10 Spec maintenance protocol  ← how this file keeps itself honest (§5)
  §11 Revision log              ← dated, per-change audit trail
docs/spec/  (appendices, linked, not moved)
  → ../product/prd.md (banner added), ../product/mobile-architecture.md,
    ../product/gtm-launch.md, ../architecture-map.md, ../data-sovereignty.md,
    ../content-curation.md, ../ml-roadmap.md, ../launch-checklist.md, ../testing.md
```

Rationale: one coherent narrative file is readable top-to-bottom, while **stable section anchors**
(`§N` + heading slugs) let the sync engine patch one section without rewriting the file — keeping
auto-update surgical and cheap. Splitting the spine into many tiny files was rejected: it adds
navigation overhead and cross-file churn for little gain at this size.

## 5. Auto-update engine

### 5.1 Capability Map = the traceability anchor (feature-level)

§4 of `SPEC.md` is a table; each capability is one row that ties a feature to the code and tests
that prove it. This is **feature-level traceability with file + testid anchors** — precise enough
for surgical updates, light enough to maintain.

| ID | Capability | Status | Key files | Proof (testids / specs) | Appendix |
|----|-----------|--------|-----------|------------------------|----------|
| CAP-ONB | Onboarding wizard | shipped | `…/OnboardingWizard.svelte` | `onboarding-*`; e2e settings | prd |
| CAP-EX  | Exercise engine (11 types) | shipped | `lesson/engine.ts`, `lesson/exercises/*` | `[data-grade]`, `feedback`; `engine.spec.ts` | testing |
| CAP-SRS | FSRS-6 spaced repetition | shipped | `srs/*` | `srs.spec.ts`; review e2e | testing |
| CAP-EXAM| DELF/DALF mock exams | shipped | `exam/*`, `routes/exam/*` | exam e2e ids | prd |
| …       | … | … | … | … | … |

`Status ∈ {shipped, beta, planned}`. The map is the **single index** the sync skill reads, so it
never has to re-scan the repo to know which section a change touches.

### 5.2 Mechanism — `frenchpath-spec-sync` skill + `/spec-sync` command

- **Home:** `.claude/skills/frenchpath-spec-sync/` (native Claude Code skill) + a `/spec-sync`
  slash command. (Existing project skills stay in `.cursor/skills/`; `AGENTS.md` gets a routing
  line so the two homes don't drift.)
- **Trigger:** the **final step of finishing a feature** (Definition of Done), or on demand.
- **Default flow (token-optimal):**
  1. Read `git diff` (working tree, or vs. the merge base for a branch).
  2. Match changed file paths against Capability-Map anchors (§5.1).
  3. **Patch only the affected `SPEC.md` sections inline** in the main thread.
  4. Append a dated entry to §11 Revision log (date, commit/branch, sections touched, severity).
- **Escalation:** for large/milestone-sized diffs (heuristic: new domain/route, or many files,
  or a new capability), dispatch a `doc-updater` subagent with the diff instead of inlining —
  keeps the main context clean. This is the only path that spends subagent tokens.
- **Never** re-derives the whole codebase.

### 5.3 Severity gating (safety)

The skill classifies each diff before editing:

| Touches | Severity | Behaviour |
|---|---|---|
| §3 Invariants or §7 ADRs | **HIGH** | **Stop and request explicit human sign-off** before editing; never silently rewrite the constitution. |
| New/changed capability, roadmap (§4/§8) | MEDIUM | Auto-patch the section + log to §11. |
| Wording/glossary/typo (§9 etc.) | LOW | Auto-patch + log. |

The skill runs **after** code review, never instead of it. It edits documentation only.

### 5.4 Knowledge accrual — "capture cheaply, distill deliberately"

- **Continuously:** log durable learnings to the memory system **and** a per-skill
  `LEARNINGS.md` beside each skill (cheap, append-only).
- **At each milestone boundary:** fold the durable learnings into the skill files **with review**,
  then prune the log. This applies to `frenchpath-spec-sync` itself and the existing
  `frenchpath-*` skills.
- Rejected: auto-rewriting skill files on every run — causes bloat, contradiction, and lost
  intent (skill-rot).

## 6. Token economy & rejected alternatives

Design choices that serve "optimal token utilisation":
- **Diff-scoped, anchor-addressed patching** — touch only changed sections.
- **Capability Map as a precomputed index** — no repo re-scan per update.
- **Subagent only when justified** — cold-start context is the expensive path; reserve it for
  large/milestone diffs.
- **Workflow-gated** — tokens spent only when a feature actually completes (DoD), not per session.

Rejected alternatives (and why):
- **Automatic Stop/PostToolUse hook** — runs the model on every session end incl. trivial ones;
  noisy; higher risk of wrong silent edits.
- **CI doc-drift gate** — needs CI wiring + a code→section mapping; defers the update to PR time
  rather than fixing it at the source; can be added later if drift is observed.
- **Full re-derive each update** — most accurate, most expensive; contradicts the token goal.

## 7. Agile loop this creates

> milestone (§8) → `writing-plans` plan in `docs/superpowers/plans/` → tested increment →
> `/spec-sync` as DoD (green-and-synced) → distill learnings at milestone close → next milestone.

Each milestone is a spec roadmap entry, a plan, and a tested increment — matching the existing
docs' cadence and the user's milestone-based preference.

## 8. Risks & severity

| Decision | Severity | Risk | Mitigation |
|---|---|---|---|
| Demote PRD SSOT → SPEC.md | MEDIUM | Two docs claiming SSOT → drift/confusion | Additive banner only; delete nothing; SPEC.md named authoritative |
| Auto-patching spec sections | MEDIUM | Skill edits a section wrongly | Diff-scoped + severity gate on invariants/ADRs + §11 audit log + runs after code review |
| Knowledge accrual into skills | LOW | Skill-file bloat/contradiction | Distill-at-milestone-with-review, not auto-edit-per-run |
| Overall doc refactor | LOW | Broken cross-links | Everything additive this phase; existing docs stay in place |

## 9. Implementation outline (for `writing-plans` to detail)

Ordered, additive:
1. **Author `docs/spec/SPEC.md`** §1–§11 from §3 + §4 of this design and a pass over the codebase
   to populate the Capability Map. **Reconcile already-drifted facts against ground truth** while
   doing so — e.g., test counts disagree today (`AGENTS.md` says "119 unit + 24 E2E" vs
   `README`/`prd`/`architecture-map` "188 unit + 35 E2E"); the authoring pass counts the actual
   suite and records the true number once, in `SPEC.md`. This drift is itself the proof the
   system is needed.
2. **Add the additive banner** to `docs/product/prd.md` pointing to `SPEC.md` as SSOT.
3. **Build `.claude/skills/frenchpath-spec-sync/`** (SKILL.md) implementing §5.2–§5.3 +
   the `/spec-sync` command.
4. **Wire knowledge accrual** — per-skill `LEARNINGS.md` convention + a milestone distill step;
   memory pointers.
5. **Add the routing line** to `AGENTS.md` for the `.claude` skill home + the DoD spec-update step.
6. **Validate** the loop on a no-op diff (sync produces no spurious edits) and on a real small
   change (sync patches exactly the right section + logs to §11).

## 10. Decisions locked in this brainstorm

- Session goal: **validate, then spec.**
- Spec model: **master spine + linked appendices.**
- Auto-update: **workflow-gated skill + `/spec-sync` command** (DoD-gated).
- Personas: **four equal**, arbitrated by an **outcome-based decision rule.**
- Bridge language: **core conviction.** Market: **India-first, expansion-ready.**
- Product nature: **learning product, exam as milestone.**
- Daily ritual: **goal + streak.** Onboarding: **guided wizard.** Tone: **playful but
  non-coercive.** Speaking: **supportive now, core later.**
- Guardrails: **on-device forever · build-time-only AI · free w/ optional non-gating supporter
  unlock · native-speaker proofread hard gate.**
- Next: **stabilise & merge current branch.** Launch: **simultaneous web + mobile.** Cadence:
  **milestone-based.** Spec update: **part of Definition of Done.**
- Spec shape: **constitution + capability map + module index.** Traceability: **feature-level w/
  file + testid anchors.** Skill memory: **capture to memory + distill at milestones.** Update
  cost: **diff-scoped inline; subagent for big changes.**
- SSOT handling: **SPEC.md = SSOT, PRD → appendix (banner).** Skill home: **`.claude/skills`.**

## 11. Open questions

None blocking. Deferred to implementation: the exact "large diff" heuristic threshold for
subagent escalation (§5.2), and whether §11 Revision log should later split into its own file if
it grows large.
