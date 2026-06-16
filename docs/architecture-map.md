# FrenchPath — Engineering Architecture Map

> Read this first. A concise map of the codebase + decision log so a new session orients
> without re-exploring. Last revised 2026-06-16.

## Repo layout
```
IndeFrancias/
├── frenchpath/            # THE product — SvelteKit + Svelte 5 + Tailwind v4 PWA (offline-first)
├── docs/                  # product + eng docs (this file, prd, mobile-architecture, gtm-launch, ...)
├── integration-package/   # source assets for the Grand Voyage UI revamp (design tokens, snippets)
└── (android/, ios/)       # Capacitor native projects (added in Phase 1)
```

## `frenchpath/` stack
Svelte 5 (runes, forced via `svelte.config.js`), SvelteKit + `@sveltejs/adapter-static` (SPA, fallback `200.html`→`index.html` for Capacitor), Tailwind v4 (`@tailwindcss/vite`), TypeScript, Vite (Rolldown), `vite-pwa` (Workbox SW), paraglide i18n, `ts-fsrs`, `idb`, Vitest, Playwright. **No backend.**

## `src/lib/` domains
| Domain | Path | Responsibility |
|---|---|---|
| **Data** | `db/` | IndexedDB schema + repos: settings, progress, srs cards, stats, streak, skill profiles, assessments. ⚠️ off-limits to UI work. |
| **SRS** | `srs/` | FSRS spaced repetition (`ts-fsrs`): queue, review scheduling, grades. ⚠️ off-limits. |
| **Lesson** | `lesson/` | `engine.ts` (grading, scoring — ⚠️ off-limits), `complete.ts`, `progression.ts` (unit gating/unlock), `exercises/*` (11 types). |
| **Content** | `content/` | `loader`, `schema`, `lexicon`, `gloss` (native-language bridges), `packs/` (A1–C1 JSON units), `exams/` (DELF/DALF). |
| **Assessment** | `assessment/` | `checkpoint.ts` (gates g1.., milestones, passed-ids, XP awards). |
| **Gamification** | `gamification/` | `streak`, `activity` (daily goal, XP, **BADGE_CATALOG**), `skillProfileUpdate`, `adaptiveSuggestions`. |
| **Audio** | `audio/` | `tts.ts` (Web Speech → native plugin), `RecordCompare.svelte`. |
| **PWA** | `pwa/` | `backup.ts` (export/import/preview — ⚠️ off-limits logic), `persist.ts`, `revisionNotify.ts`. |
| **Profile** | `profile/` | `types`, `goalCopy` (learning-goal labels, home subtitle), `frenchTips`. |
| **Theme** | `theme/` | `apply.ts` (dark/light), `tokens.css` / `animations.css` / `characters.css` (Grand Voyage). |
| **Exam** | `exam/` | `MockExamRunner.svelte`, `score.ts`, `types.ts`, `ExamTimer.svelte`. |
| **Path/UI** | `path/` `components/` `celebration/` | `VoyageMap`, `PathNode`, characters (Mira/Léo/Coco), `DailyRitual`, `AchievementToast`, lesson/gloss components. |
| **Platform** | `platform/` | (Phase 1, new) native-vs-web seam for Capacitor. |

## Routes (`src/routes/`)
`/` home (Le Voyage + sidebar) · `/learn/[unitId]` lesson · `/review` FSRS · `/progress` L'Atelier · `/settings` · `/checkpoint/[groupId]` · `/exam/{delf-a2,delf-b1,delf-b2,dalf-c1}`. Global chrome + nav in `+layout.svelte`; global CSS `routes/layout.css`.

## Cross-cutting
- **i18n** — paraglide; messages in `messages/{locale}.json` (10 locales: en, hi, hinglish, bn, ta, te, kn, mr, gu, pa; base `en`). Generated code in `src/lib/paraglide` (**gitignored**, regen on build).
- **CSP** — strict, in `svelte.config.js` (`default-src 'self'`). Blocks CDN fonts → fonts self-hosted via `@fontsource` (see ADR-5). e2e enforces "no CSP violations."
- **Offline** — bundled assets + SW; IndexedDB on-device; no network for core flows.
- **Testing** — Vitest unit (`src/**/*.spec.ts`), Playwright e2e (`e2e/*.e2e.ts`, builds + previews on :4173). Baseline: **188 unit + 35 e2e green**.

## Invariants (do not break)
1. Don't modify `db/`, `srs/`, `lesson/engine.ts`, `pwa/backup*.ts` logic without explicit intent + the offline-data-safety review.
2. Preserve every `data-testid` the e2e suite uses (e.g. `unit-card`, `path-scene`, `streak-badge`, `daily-goal`, `feedback`, `[data-grade]`, exam/settings ids). Settings controls must stay real `<select>`/`<input>` (e2e uses `selectOption`/`check`).
3. Keep `default-src 'self'` CSP intact; no runtime CDN requests; fonts stay self-hosted (not `data:`-inlined).
4. Honor reduce-motion; keep accessibility (focus rings, `aria-live`, ≥44px targets).
5. Every change ends green: `npm run check` (0/0) + `npm run lint` + unit + e2e.

## Commands (run in `frenchpath/`)
`npm run dev` · `npm run build` · `npm run check` · `npm run lint` / `format` · `npx vitest run` · `npx playwright test` · (Phase 1+) `npx cap sync` / `cap run android|ios`.

## Decision log (ADRs)
- **ADR-1 Offline-first, no-backend, no-account.** On-device IndexedDB; JSON export/import for backup + transfer. Rationale: India connectivity/data-cost + privacy moat. Status: accepted.
- **ADR-2 FSRS via `ts-fsrs`.** Modern spaced-repetition over SM-2. Status: accepted.
- **ADR-3 adapter-static SPA.** No SSR/runtime server; `paths.relative:false`; SPA fallback. Enables Capacitor wrap. Status: accepted.
- **ADR-4 Strict CSP (`default-src 'self'`).** Security hardening; no external runtime requests. Status: accepted.
- **ADR-5 Self-hosted fonts (`@fontsource`).** CSP blocks CDN fonts; Vite `assetsInlineLimit` excludes fonts so they aren't CSP-forbidden `data:` URIs. Status: accepted. (memory: `frenchpath-csp-fonts`)
- **ADR-6 "Le Grand Voyage" UI.** Warm Mumbai→Paris journey + characters; tokens in `theme/`. Status: shipped.
- **ADR-7 Mobile via Capacitor (not React Native).** Wrap the PWA → web+Android+iOS one codebase; RN prototype removed. Status: accepted. (memory: `frenchpath-mobile-capacitor`; plan: `~/.claude/plans/lovely-twirling-nest.md`)

## See also
`docs/product/prd.md`, `docs/product/mobile-architecture.md`, `docs/product/gtm-launch.md`, `docs/data-sovereignty.md`, `docs/content-curation.md`, `docs/ml-roadmap.md`, `docs/testing.md`, `docs/launch-checklist.md`.
