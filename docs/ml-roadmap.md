# FrenchPath — ML Roadmap (Post-Launch)

Privacy-first, offline-only. No user accounts. All inference on-device unless noted as build-time CI.

## Principles

1. **No runtime cloud ML** at launch — learner data never leaves the device.
2. **Progressive enhancement** — speech features degrade gracefully on non-Chromium browsers.
3. **Interpretable first** — FSRS-6 and rule-based rubrics before neural models.
4. **Opt-in data flywheel (future)** — anonymized aggregate export only, no PII.

## Phase V1 — 4–8 weeks post-launch

### On-device personalization

| Feature | Data source | Approach |
|---------|-------------|----------|
| FSRS parameter optimization | `reviewLog` store (≥500 reviews) | `src/lib/srs/optimizer.ts` stub + Web Worker (V1); port open-spaced-repetition optimizer |
| Adaptive unit suggestions | `skillProfile` store | `src/lib/gamification/adaptiveSuggestions.ts` on home CoachTip |
| Retention forecast UI | `srsCards` FSRS state | Pure math via `ts-fsrs` — no ML |

**Why not deep learning:** sparse per-user data; FSRS-6 already SOTA for SRS; mobile training cost is high.

### Speech & writing (V1)

| Feature | Technology | Notes |
|---------|------------|-------|
| Pronunciation scoring | Web Speech API (`webkitSpeechRecognition`) | Chromium-only; Levenshtein vs expected phrase |
| Shadowing mode | Audio + transcript scroll sync | No ML — UX pattern |
| Writing rubric feedback | JSON rule patterns | e.g. `je suis` + age → suggest `j'ai`; `avoir faim` errors |

## Phase V2 — 3–6 months post-launch

| Feature | Technology | Notes |
|---------|------------|-------|
| On-device writing LLM | Transformers.js + Qwen2.5-0.5B-Instruct or Phi-3-mini | WebGPU when available; rubric fallback |
| On-device ASR upgrade | whisper.cpp WASM (tiny/base) | Optional download (~40–75 MB) |
| DALF C1 prep module | Content + exam schema | No ML required for MVP |

## Build-time only (CI / scripts)

| Feature | Technology | Notes |
|---------|------------|-------|
| Content drafting | Anthropic Claude (`claude-sonnet-4-6`) | Existing `scripts/generate-content.ts` |
| French QA flags | `scripts/proofread-report.ts` | Duplicate IDs, English in French fields, gender heuristics |
| Optional CI enrichment | LanguageTool public API | Rate-limited; never in runtime app |

## Future data schema (opt-in export)

```typescript
interface AnonymizedLearningExport {
  schemaVersion: number;
  reviewCount: number;
  avgRetention: number;
  errorPatterns: string[]; // aggregate rule IDs, not raw answers
  locale: string;
  deviceClass: 'mobile' | 'desktop';
}
```

Store implementation spec in `docs/ml-data-schema.md` when V1 personalization ships.

## Architecture (target state)

```
reviewLog → FSRS optimizer (Worker) → custom weights in settings
lesson scores → skillProfile → adaptive recommendations UI
writing input → rule engine (V1) → on-device LLM (V2, optional)
speech input → Web Speech API (V1) → Whisper WASM (V2, optional)
```

## Explicit non-goals

- Cloud sync for ML training
- PostHog / third-party behavioral analytics
- Server-side inference
- B1+ content generation blocking launch (separate milestone — see [content-curation.md](./content-curation.md))

## Deferred UI (post-launch)

### PathScene3D / Threlte path ribbon

**Status:** deferred. Launch uses CSS 2.5D perspective only in [`PathScene.svelte`](../frenchpath/src/lib/path/PathScene.svelte) (`fp-path-scene--3d` is CSS transforms, not WebGL).

**Current stack:** Threlte is already used for celebration particles in [`CelebrationScene.svelte`](../frenchpath/src/lib/celebration/CelebrationScene.svelte). A full path ribbon in WebGL is a separate, heavier surface.

**Rationale:**

- 58-unit path scales acceptably with CSS perspective on mobile
- WebGL ribbon adds bundle weight and GPU variance on low-end devices
- Celebration 3D is optional and short-lived; the path is always visible

**Future criteria to implement:**

1. Lazy-loaded `PathScene3D.svelte` (code-split; not on critical path)
2. `prefers-reduced-motion` and low-end GPU fallback to CSS `PathScene`
3. Lighthouse performance budget check before enabling by default

**Explicit non-goal at launch:** no `canUseWebGL()` probe or misleading “3D path” flag — removed from `PathScene` for honesty.
