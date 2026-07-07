---
target: /review, /checkpoint/[groupId], /exam/* (MockExamRunner) + ReadingExercise glass — M2.5 Task 6 editorial pass
total_score: n/a (targeted audit, not full heuristic re-score)
p0_count: 0
p1_count: 1
timestamp: 2026-07-07T16-05-00Z
slug: review-checkpoint-exam-editorial
---
# Critique — Review / Checkpoint / Exam editorial pass (Task 6, Step 5)

Scope: apply the branch's editorial direction (serif display headings,
`fp-figure`/`fp-eyebrow` for numerals/labels, hairlines over heavy borders,
restrained ease-out motion) to the lesson-loop assessment surfaces. Bans
checked: glass default, bounce easing, border-left stripes, gradient text,
hero-metric, eyebrow-everywhere. AchievementToast/XpFloat excluded (already
re-skinned in a prior task; no ban violations found in them on re-grep).
Constraint: no new message keys, no new utility classes, all data-testids
preserved (verified against frenchpath/e2e/ before editing).

## Findings against the checklist

| Check | File | Verdict |
|---|---|---|
| Ban: glass default | `ReadingExercise.svelte:43` passage wrapped in `fp-glass-panel` (only remaining glass surface in the lesson loop; same class family as the exercise-panel clipping bug fixed earlier on this branch) | **Fixed** — swapped to `surface-card`, matching every other card surface |
| Serif display headings | `review/+page.svelte` flashcard front/back h1: inline `style="font-family: var(--fp-font-display)"` + magic `text-3xl font-bold md:text-4xl` | **Fixed** — `fp-display-lg text-balance`; inline style and per-breakpoint sizing removed (duplicated what the token utility already does) |
| Serif display headings | `review/+page.svelte` "nothing due" + "review complete" h1s (`text-2xl font-bold`) | **Fixed** — `fp-display-md text-balance` |
| Serif display headings | `checkpoint/+page.svelte` intro h1 (gate label) and result h1 (`text-2xl font-bold`) | **Fixed** — `fp-display-md text-balance` |
| Serif display headings | `MockExamRunner.svelte` result h1 (`text-2xl font-bold`) | **Fixed** — `fp-display-md`, score numeral wrapped in `fp-figure` |
| Numerals as mono figures | `checkpoint` Question/Hints counters, `+{xp} XP`; `MockExamRunner` Question counter, section counter, `+{xpAwarded} XP`, per-skill `{score} / 25` | **Fixed** — `fp-figure` spans around numerals only (surrounding copy untouched, no key changes) |
| Eyebrow treatment | `MockExamRunner.svelte:177` section label hand-rolled `text-xs font-semibold tracking-wide uppercase` | **Fixed** — replaced with the `fp-eyebrow` utility (+ existing `text-primary` kept for exam-mode navy). Not eyebrow-overuse: it is the single kicker above the section h2, exactly the pattern's intended slot |
| Hairlines over heavy borders | `review` card-back divider uses `border-t border-border` (1px) | **OK as-is** — already a hairline; `fp-hairline` is an `<hr>` utility, swapping markup for zero visual change fails smallest-diff |
| Restrained motion / no bounce | grade buttons (0.1s ease press), flip card, `fp-stamp` (ease-out), ADMIS/RECALÉ stamps (ease-out, covered by global reduce-motion kill-switches in layout.css:634-649) | **No violations** |
| Ban: border-left stripes, gradient text, hero-metric | all four surfaces | **None found** |
| Consistent correct/incorrect feedback | exercise types share `option-correct/incorrect`, `feedback-correct/incorrect`, and `answerInputClass` (green/red border-2) across lesson, checkpoint, and exam runners — same components (`Exercise.svelte`) render in all three | **Consistent — no change needed.** ClozeExercise carries a private `inputClass()` that duplicates `answerInputClass` with inline-block/center tweaks; visual output is identical in the states users see, consolidation logged as future cleanup, not a Task 6 fix |
| A11y | headings keep semantic order; testids untouched; focus rings unchanged | No regressions |

## What was fixed (per-surface commits)
1. `/review` — flashcard h1s → `fp-display-lg` (inline font-family style removed), empty/done-state h1s → `fp-display-md`.
2. `/checkpoint/[groupId]` — intro/result h1s → `fp-display-md text-balance`, Question/Hints/XP numerals → `fp-figure`.
3. `/exam/*` (`MockExamRunner.svelte`) — section kicker → `fp-eyebrow`, result h1 → `fp-display-md`, all numerals (section/question counters, total score, XP, per-skill scores) → `fp-figure`.
4. `ReadingExercise.svelte` — `fp-glass-panel` → `surface-card` (glass ban; orchestrator-added scope).

## Deliberately left
- `review` card-back `border-t border-border` divider — already hairline-weight.
- `fp-grade-btn` magic `14px/800` type — bespoke component tokens predating the editorial pass; retokenizing needs a new utility (out of scope).
- ClozeExercise's duplicated input-class helper — behavioral no-op to consolidate, logged for a cleanup pass.
- Hardcoded English strings on checkpoint page ("Pass to unlock…", "Start checkpoint", etc.) — pre-existing; fixing needs new message keys, which Task 6 forbids.
- AchievementToast/XpFloat — re-skinned in a prior task; re-grepped for ban violations only (none: `fp-stamp` is ease-out, no glass/gradient/bounce), left untouched per orchestrator instruction.
