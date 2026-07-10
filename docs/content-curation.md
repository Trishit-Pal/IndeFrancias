# FrenchPath — Content Curation (B1–C1)

This document defines the **launch gate** for lesson JSON quality and the workflow for
curating B1–C1 template packs after launch.

## Launch scope

| Tier | Units | Proofread gate | Ship status |
|------|-------|----------------|-------------|
| A1 + A2 | 18 | **Must pass** `content:proofread:launch` | Launch-ready |
| B1 + B2 + C1 | 34 | Not required for merge | **Beta template** — structurally valid, pedagogically generic |

All **52** units must pass `content:validate` (zod schema + manifest). Only A1/A2 must pass
automated French QA at launch.

## Commands

| Command | Scope | CI |
|---------|-------|-----|
| `npm run content:validate` | All 58 units | Required — fails on schema errors |
| `npm run content:proofread:launch` | A1/A2 only (`--launch`) | Required — launch gate |
| `npm run content:proofread` | All 58 units | Informational in CI (`continue-on-error`); use locally after curation batches |

Run from `frenchpath/`:

```bash
npm run content:validate
npm run content:proofread:launch   # must exit 0 before release
npm run content:proofread          # expect B1+ flags until curated
```

## Known B1+ template issues

Units under `src/content/packs/b1/`, `b2/`, and `c1/` were seeded from
[`scripts/seed-b1-c1.ts`](../frenchpath/scripts/seed-b1-c1.ts) and
[`scripts/syllabus-b1-c1.ts`](../frenchpath/scripts/syllabus-b1-c1.ts). They are
**structurally valid** but often fail full proofread because of:

- Meta-glosses with English in Dravidian script fields (ta/te/kn)
- Repeated bridge copy (Priya/Arjun, Mumbai/Delhi placeholders)
- Generic card glosses derived from unit titles rather than vocabulary meaning
- Hints/coach notes backfilled by [`scripts/seed-hints-b1-c1.ts`](../frenchpath/scripts/seed-hints-b1-c1.ts) — functional but not pedagogically tuned

Fix by **human curation**, not by relaxing proofread rules.

## Curation workflow

Work in batches (recommended: units 1–4 per level first, then 5–8, etc.):

1. Pick a batch (e.g. B1 units 01–04).
2. Draft or rewrite via `ANTHROPIC_API_KEY=... npm run content:generate <unit-id>` or manual edit.
3. Move curated JSON into `src/content/packs/<level>/`.
4. Run `npm run content:validate` and `npm run content:proofread` on the full tree.
5. Fix flags until the batch is clean (or document exceptions with reviewer sign-off).
6. Optional: open a GitHub issue per batch with checklist:
   - Native French review
   - Hindi/regional gloss review
   - Full proofread green for touched units
   - Spot-check in app (lesson + checkpoint pool)

Repeat until `content:proofread` passes on all 58 units.

## In-app policy

- **Onboarding disclaimer only** — `onb_beta` in [`OnboardingWizard.svelte`](../frenchpath/src/lib/components/OnboardingWizard.svelte) states AI-authored content and ongoing proof-read.
- **No path-band Beta chips** — B1–C1 bands use the same path UI as A1/A2; learners discover beta quality through the onboarding note and content depth, not extra chrome.

## Related docs

- [Launch checklist](./launch-checklist.md)
- [Testing guide](./testing.md)
- [Data sovereignty](./data-sovereignty.md) — static content vs learner data
- [ML roadmap](./ml-roadmap.md) — build-time Claude drafting, post-launch personalization
