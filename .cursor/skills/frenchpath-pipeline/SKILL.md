---
name: frenchpath-pipeline
description: >-
  FrenchPath build-time content pipeline — syllabus, JSON lesson packs, zod schema,
  generate-content script, validate-content. Use when editing frenchpath/scripts/,
  frenchpath/src/content/, or frenchpath/src/lib/content/.
---

# FrenchPath Content Pipeline

There is **no runtime backend**. This skill covers the build-time "backend": content authoring, validation, and AI-assisted drafting.

## Workflow

1. Define unit brief in `scripts/syllabus.ts`
2. Draft via `ANTHROPIC_API_KEY=... npm run content:generate [unit-id]`
3. Curate draft from `src/content/drafts/` → move to `src/content/packs/<level>/`
4. Validate: `npm run content:validate` (updates `manifest.json`, runs zod + CI spec)
5. Proofread:
   - **Launch gate:** `npm run content:proofread:launch` (A1/A2 only; `--launch` in `proofread-report.ts`)
   - **Full tree:** `npm run content:proofread` (all 52 units; B1+ expected to flag until curated)

See [docs/content-curation.md](../../docs/content-curation.md) for launch vs full scope and curation batches.

## Schema

Single source of truth: `src/lib/content/schema.ts` (zod).

- Exercise types: mcq, cloze, matching, dictation, translation, reorder, conjugation, gender
- Vocab cards: french, gender, hindiGloss, englishGloss, optional audioRef
- Units: id, cefrLevel, title, objective, cards[], exercises[], optional bridge

## AI generation

- Script: `scripts/generate-content.ts`
- Model: `claude-sonnet-4-6` via `@anthropic-ai/sdk`
- **Never ship drafts without human curation**
- Run `scripts/proofread-report.ts` for automated French QA flags
  - `npm run content:proofread:launch` — CI gate (A1/A2)
  - `npm run content:proofread` — full report after curation batches

## Conventions

- Unit IDs: `a1-unit-01`, `a2-unit-03`, etc.
- JSON packs must pass `content.spec.ts` in CI
- Indian context: Priya/Arjun, Indian cities, festivals, food
- Contrastive pedagogy: Hindi/English bridge sections where helpful

## Verification

```bash
npm run content:validate
npm run content:proofread:launch   # before release
npm run content:proofread          # after B1+ curation batches
npm run test:unit -- --run src/lib/content/content.spec.ts
```

## Non-goals

- No in-app AI at runtime
- No committing `ANTHROPIC_API_KEY` or `.env` secrets
