---
target: /progress (L'Atelier), /settings — M2.5 Task 7 typographic pass
total_score: n/a (targeted audit, not full heuristic re-score)
p0_count: 0
p1_count: 0
timestamp: 2026-07-07T18-38-44Z
slug: progress-settings-figures
---
# Critique — Progress / Settings typographic pass (Task 7)

Scope: apply Task 2's new editorial utilities (`fp-display-md/lg`, `fp-figure`,
`fp-eyebrow`, `fp-hairline`) to `/progress` and `/settings`. Both routes already
received full impeccable polish passes earlier on this branch (`2d5f655`
progress, `9b5ebab` settings), so this is a narrow follow-up, not a re-audit.
Constraint: no new message keys, no new utility classes, no restructuring,
all `data-testid`s preserved (grepped `frenchpath/e2e/` first — neither route's
testids are asserted by name in e2e specs, but preserved regardless per
constraint).

## Findings against the checklist

| Check | File | Verdict |
|---|---|---|
| Display heading duplicated inline | `progress/+page.svelte:134-139` h1 "L'Atelier" — `text-4xl` + `style="font-family: var(--fp-font-display); font-weight: 400; line-height: 1.1"` duplicates `fp-display-lg` (same family/weight, near-identical line-height) — home page's h1 already uses the utility for the same role | **Fixed** — `fp-display-lg text-balance text-foreground`, inline style removed |
| Display heading duplicated inline | `settings/+page.svelte:236-241` h1 — identical duplicate pattern | **Fixed** — same swap |
| Numeral as editorial figure | `progress/+page.svelte:178-183` longest-streak number (`text-2xl font-bold`, plain, no tabular/mono) — explicitly named in task remit | **Fixed** — added `fp-figure` |
| Numeral as editorial figure | `progress/+page.svelte:186-189` review-forecast number — not named in the task's explicit list, but structurally identical sibling card (same `surface-card`, same number treatment) right next to longest-streak | **Fixed** — added `fp-figure` for consistency; leaving one sibling styled and the other not would be a typographic *inconsistency* introduced by this pass |
| 7-day XP chart numeric values | `progress/+page.svelte:157-169` — no visible XP numeral text node exists; the only places `day.xp` appears are a `title` tooltip attribute and an `aria-label` (neither rendered/styled text). This is precisely the brief's own "leave it, e.g. chart bars" example | **No change** — nothing to attach `fp-figure` to without restructuring |
| Skill-bar percentages | `progress/+page.svelte:240-262` — the per-skill bar renders the CEFR tier (`A1`–`C1`) as visible text, not the numeric `pct` (only used for `width`/`aria-valuenow`, never rendered). No percentage numeral exists in the DOM to style | **No change** — named target doesn't exist in code as rendered text; CEFR tier is a categorical label, not a figure |
| Settings numeric stat: storage usage | `settings/+page.svelte:513-519` storage section — only a text notice (`settings_storage_notice`), no MB/KB or quota numeral is rendered anywhere on the page | **No change** — named target doesn't exist in code |
| Settings numeric stat: last-export date | `settings/+page.svelte:526-530` — date is interpolated inside a single translated string (`m.settings_last_export({ date })`); isolating just the date for `fp-figure` would need either a new message key (forbidden) or splitting the sentence outside the translation (breaks grammar in several of the 10 locales) | **No change** — deliberately left, documented risk |
| `fp-eyebrow` candidates | grepped both files for `uppercase`/`tracking`/manual letter-spacing | **None found** — `.fp-stat-lbl` (5-stat grid caption) already has its own deliberate eyebrow-like styling as an established, reused component class, not an inline one-off duplicate; not a consolidation target |
| `fp-hairline` candidates | grepped both files for `border-t`/`border-b`/`<hr>`/`divide-` | **None found** — progress's one `divide-y divide-border` is a list-item divider inside a card (different role than a section separator), settings has none at all |
| Assessment-history score (`{a.score}% · +{a.xpAwarded} XP`) | `progress/+page.svelte:275` | **Deliberately left** — not in the task's named remit; scope-creep risk outweighs the marginal consistency gain |
| Coco XP-to-next-level line (`style="font-family: var(--fp-font-mono)"`) | `progress/+page.svelte:312-314` | **Deliberately left** — same reasoning; already has its own mono treatment from the prior polish pass, not named in this task's remit |
| a11y / testids | both files | No regressions — every `data-testid` untouched, only `class`/`style` attributes changed |

## What was fixed
1. `progress/+page.svelte` — h1 → `fp-display-lg` (inline style removed); longest-streak and review-forecast numerals → `fp-figure`.
2. `settings/+page.svelte` — h1 → `fp-display-lg` (inline style removed).

## Deliberately left
- 7-day XP chart — no visible numeral text node (only tooltip/aria attributes); matches the brief's own "leave it" example verbatim.
- Skill-bar percentages — not rendered as text in the current markup (CEFR tier shown instead); nothing to style without restructuring, which is out of scope.
- Settings storage usage — no numeral rendered in code today.
- Settings last-export date — numeral is embedded inside a single translated sentence; isolating it needs either a new message key or unsafe string-splitting across 10 locales.
- Assessment-history score and Coco XP-to-next-level line — genuine numeral figures but outside this task's explicitly named remit; left to keep the diff to exactly what was asked for.
