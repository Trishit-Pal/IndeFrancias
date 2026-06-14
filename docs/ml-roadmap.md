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
| FSRS parameter optimization | `reviewLog` store (≥500 reviews) | Port open-spaced-repetition optimizer to Web Worker; store custom weights in `settings` |
| Adaptive unit suggestions | `skillProfile` store | Heuristic: recommend units targeting lowest estimated skill level |
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
- B1+ content generation blocking launch (separate milestone)
