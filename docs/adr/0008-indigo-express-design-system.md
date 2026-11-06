# ADR-8: "L'Indigo Express" unified design system

**Status:** Accepted — supersedes ADR-6 "Le Grand Voyage" UI (retroactive — documents decisions shipped on `feat/ui-revamp-indigo-express`, 12 commits ahead of `origin/main`)
**Date:** 2026-11-06
**Deciders:** Product owner (design interview, locked decisions in `docs/superpowers/plans/2026-07-12-premium-ui-revamp.md`)

## Context

Before the revamp the app ran **two half-merged design systems**: a warm "Le Grand Voyage" palette in `src/lib/theme/tokens.css` and a cool-blue glass layer in `src/routes/layout.css` (`--fp-primary #2563eb`). They collided (`--fp-muted` defined twice), dark mode only covered the blue layer, icons were emoji (platform-dependent rendering), and modal/banner/icon-button markup was duplicated 4–5×.

Forces at play:
- **Strict CSP** (`default-src 'self'`) — no CDN fonts, no external icon sprites.
- **Offline-first PWA** — every asset must be precacheable; precache size matters on low-end Android (Capacitor).
- **No component unit tests** — UI correctness is guarded only by 42 Playwright E2E specs that select on `data-testid`.
- **Accessibility** — app-level "reduce motion" setting plus OS `prefers-reduced-motion`.

## Decision

1. **One token contract** (`tokens.css`) with light *and* dark values for every semantic role (`--fp-ink/paper/surface/rose/marigold/seine/sage/error`), tints via `color-mix()`, consumed by `layout.css` and components. Layer B is removed.
2. **Custom inline SVG icon registry** — `src/lib/components/icons.ts` (static `as const` path map) rendered by `Icon.svelte` (`aria-hidden`, `currentColor`).
3. **SVG `VoyageMap.svelte`** as the home-screen signature (India→Paris route), replacing the DOM/CSS `PathScene.svelte`. Lesson nodes are real `<a href>` links.
4. **Shared primitives**: `Modal`, `InfoBanner`, `IconButton`; **single `CelebrationOverlay`** replaces `AchievementToast`.
5. **Variable fonts** via `@fontsource-variable/{fraunces,manrope}` (self-hosted), replacing Instrument Serif + 5 static Manrope weights.
6. **View transitions** via SvelteKit `onNavigate` + `document.startViewTransition`, feature-detected.

## Options Considered

### Theming: unified token contract (chosen) vs Tailwind palette classes vs keep two layers
| Dimension | Token contract | Tailwind palette classes | Keep two layers |
|---|---|---|---|
| Complexity | Low | Med (dark: variants everywhere) | High (collisions) |
| Dark-mode completeness | One place per role | Per-call-site | Partial (status quo) |
| Exam-mode re-skin | Re-pin vars on `.fp-exam-mode` | Duplicate classes | Hard |

### Icons: custom SVG registry (chosen) vs icon library (lucide) vs emoji
| Dimension | Custom registry | Library | Emoji |
|---|---|---|---|
| CSP / offline | Inline, zero requests | Fine if bundled | Fine |
| Consistency across platforms | Exact | Exact | Poor |
| Maintenance | Hand-drawn paths to own | Free updates | None |
| Bundle | Only used glyphs | Tree-shaken, comparable | 0 |

### Home path: SVG VoyageMap (chosen) vs keep PathScene vs 3D (Threlte)
| Dimension | SVG map | PathScene | Threlte 3D |
|---|---|---|---|
| Brand signature | Strong | Weak | Strong |
| A11y | Native links in SVG | Native links | Needs parallel DOM |
| Perf on low-end Android | Good | Good | Risky |

## Trade-off Analysis

The token contract and primitives trade a one-time migration cost for removing an entire class of drift (collisions, half-dark screens, duplicated dialog markup). The custom icon set trades ongoing ownership of ~40 paths for exact brand control under strict CSP — acceptable at this size; revisit if the set grows past ~100 glyphs. SVG over 3D keeps the signature element accessible and cheap; Threlte stays only for `CelebrationScene`.

## Consequences

**Easier**
- Dark mode and exam mode are token re-pins, not per-screen work.
- New dialogs/banners reuse `Modal`/`InfoBanner` (already used by settings, home, learn, checkpoint, `MockExamRunner`); test ids forward via a `testid` prop.
- Smaller font precache (one variable file per family).

**Harder**
- Primitives now carry a11y responsibility for every consumer — a gap in `Modal` is a gap in 5 screens.
- Hand-maintained icon paths have no visual regression test.
- Visual regressions are invisible to the current suite (E2E checks behavior, not pixels).

**Review follow-up (2026-11-06)** — gaps found in review and how they were closed:
- **Text contrast:** accent fills (`--fp-saffron` 2.40:1, `--fp-sage` 3.19:1) were used as text. Added `--fp-saffron-text` / `--fp-sage-text` / `--fp-on-error`; `src/lib/theme/contrast.spec.ts` enforces ≥ 4.5:1 for text tokens in both themes. **Rule: accent tokens are fills; text uses the `-text` sibling.**
- **Modal focus:** migrated to native `<dialog>` + `showModal()` (inert background, Escape, focus restore — no dependency). The dialog stays mounted and toggles via `showModal()`/`close()`; removing an open dialog skips focus restore. Guarded by `accessibility.e2e.ts` "modal traps Tab focus…".
- **Reduced motion:** view transitions now also skip on OS `prefers-reduced-motion` (`svelte/motion`).
- **Legacy tokens:** `--fp-terracotta`, `--fp-navy`, `--fp-primary*` kept as **supported aliases** (70+ users; don't extend). `--fp-midnight` removed (no users).
- Open: `@fontsource-variable/*` in `dependencies` vs other `@fontsource/*` in `devDependencies` — harmless for a static build, inconsistent.

## Action Items
1. [x] Focus trap + restore in `Modal.svelte` (native `<dialog>`).
2. [x] Skip view transitions on OS `prefers-reduced-motion`.
3. [x] Legacy aliases documented in `tokens.css`; `--fp-midnight` removed.
4. [ ] Consider Playwright screenshot snapshots for home (VoyageMap) light/dark to catch visual regressions.
5. [x] Text-safe accent tokens + contrast spec.
6. [ ] Refresh stale test counts in `AGENTS.md` (says 188/35; now 282 unit / 43 E2E).
7. [x] De-flake `app.e2e.ts` "replaying a perfect lesson awards zero improvement XP": `completeLesson` answers by position while Matching/Reorder shuffle with `Math.random`, so the replay sometimes out-scores the first run (pre-existing since `67eb6d9`). Fixed by pinning `Math.random` in that test.
