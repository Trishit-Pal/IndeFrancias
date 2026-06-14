# FrenchPath

An **offline-first, no-account** Progressive Web App that teaches French (CEFR **A1 → C1**)
to **Indian learners**, using Hindi/English contrastive pedagogy and **FSRS-6** spaced
repetition. All progress lives on-device in IndexedDB — there is no backend and no sign-up.

> **Status: full A1–A2 MVP.** A learner can work through a locked path of **10 A1 + 8 A2 lessons**
> (18 units), practise with **8 exercise types**, record & compare their pronunciation, build a
> **streak** toward a daily goal, review with **FSRS-6 spaced repetition**, sit a **mock DELF A2**,
> switch the UI between **Hindi / English / Hinglish**, and do it all **offline with no account** —
> installable with real maskable icons. The build-time AI pipeline extends content to B1–C1.
> See [Roadmap](#roadmap). _Note: the French was AI-authored + curated; a native-speaker
> proof-read is recommended before public release._

## Tech stack

| Concern            | Choice                                                        |
| ------------------ | ------------------------------------------------------------- |
| Framework          | SvelteKit (Svelte 5, runes) + TypeScript                      |
| Build / PWA        | Vite + `@vite-pwa/sveltekit` (Workbox `generateSW`)           |
| Output             | `@sveltejs/adapter-static` (prerendered shell + SPA fallback) |
| On-device storage  | IndexedDB via `idb`                                           |
| Spaced repetition  | `ts-fsrs` (FSRS-6)                                            |
| Content validation | `zod` (single source of truth)                                |
| Styling            | Tailwind CSS v4                                               |
| i18n               | `@inlang/paraglide-js` (en / hi)                              |
| Tests              | Vitest + `fake-indexeddb` (unit) · Playwright (E2E)           |

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

### Scripts

```bash
npm run build        # static build into ./build (prerender + service worker)
npm run preview      # serve the production build on :4173
npm run check        # svelte-check (types)
npm run lint         # prettier --check + eslint
npm run format       # prettier --write
npm run test:unit    # vitest (add --coverage for a report)
npm run test:e2e     # playwright (builds + previews, then runs e2e/)
```

## Architecture

- **No runtime server.** The app is prerendered at build time and served as static files.
  The dynamic lesson route (`/learn/[unitId]`) is client-rendered and reached offline via the
  service worker's `navigateFallback`.
- **All state is on-device** in a single versioned IndexedDB database (`frenchpath`), accessed
  through thin repositories in `src/lib/db`. Pure business logic (grading, FSRS scheduling,
  lesson completion) is separated from Svelte components so it is unit-tested in Node.
- **Content is data.** Lesson units are JSON validated by a `zod` schema
  (`src/lib/content/schema.ts`); `src/lib/content/content.spec.ts` acts as a CI gate that
  rejects malformed content. Units are code-split and precached for offline use.
- **No in-app AI.** The runtime is fully deterministic. AI is used only at build time (later
  phases) to draft content, which humans then curate.

### Layout

```
src/lib/db/         IndexedDB schema + repositories
src/lib/content/    zod schema + lazy unit loader
src/lib/srs/        FSRS wrapper, review queue, review recording
src/lib/lesson/     grading engine, completion, exercise components
src/lib/pwa/        persistence request + JSON backup export/import
src/content/        manifest.json + packs/<level>/*.json (lessons)
src/routes/         home (path map), learn/[unitId], review, progress, settings
e2e/                Playwright tests
```

## Content pipeline

Lessons are JSON validated by the `zod` schema. To author at scale:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run content:generate        # draft all syllabus units
ANTHROPIC_API_KEY=sk-ant-... npm run content:generate a2-unit-03  # one unit
# curate drafts in src/content/drafts/, move into src/content/packs/<level>/, then:
npm run content:validate   # validates packs + regenerates the manifest
npm run content:proofread  # flags English in French fields, duplicate card IDs
```

## Deploy (Vercel)

- **Root directory:** `frenchpath/`
- **Build command:** `npm run build`
- **Output directory:** `build/`
- Security headers: `vercel.json` and `static/_headers` (Netlify/Cloudflare)
- See [docs/launch-checklist.md](../docs/launch-checklist.md) before promoting to production.

The A1–A2 syllabus (`scripts/syllabus.ts`) defines ~18 unit briefs; all **18 units** are authored, validated, and shipped in `src/content/packs/`.

## Roadmap

- **Done (full A1–A2 MVP):** PWA + offline + data layer; FSRS review; 8 exercise types; retention
  loop (streaks/daily-goal/lesson unlock); onboarding; record-and-compare; maskable PNG icons;
  content pipeline; **complete A1 (10) + A2 (8) = 18 units**; mock DELF A2; **Hindi/English/Hinglish
  UI toggle across all screens** (Paraglide).
- **Next:** native-speaker proof-read of the AI-authored French; generate B1+ via the pipeline;
  deeper design pass.
- **V1 (B1–B2):** reading/listening/shadowing, rubric writing feedback, optional Chromium ASR.
- **V2 (C1):** DALF C1 module, adaptive sequencing, on-device FSRS optimisation.

## Notes / known follow-ups

- **App icon:** maskable PNGs (64/192/512 + apple-touch) are generated from `static/icon.svg`
  via `@vite-pwa/assets-generator` (`pwa-assets.config.ts`); regenerate with `npx pwa-assets-generator`.
- **UI i18n:** Paraglide is wired (en/hi); translating the UI chrome and adding a Hinglish
  locale is Phase 1. Lesson content already shows Hindi + English glosses.
- **OneDrive + builds:** if `npm run build` fails on Windows with `EPERM` on `./build`, it's
  OneDrive locking the folder mid-sync — delete `build/` and retry (or pause OneDrive sync).
- **Service worker** runs only in production (`build`/`preview`), not in `vite dev`.
