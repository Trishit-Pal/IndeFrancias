# FrenchPath Premium UI Revamp — "L'Indigo Express"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement phase-by-phase. The app must stay shippable and all 42 e2e green after EVERY phase.

**Goal:** Extensively revamp the web + app frontend into a premium, distinctive Indo-French design language — fully responsive (bespoke mobile + desktop), fully theme-aware (complete light AND dark), preserving every existing feature and keeping 267 unit + 42 e2e tests green.

**Tech Stack:** SvelteKit (Svelte 5 runes) + Tailwind v4 CSS-first, @fontsource self-hosted fonts (strict CSP), Playwright e2e, adapter-static SPA.

**Working directory:** `frenchpath/` (all commands run there).

---

## Context

The user is "not at all satisfied" with the current look. Exploration confirmed why: the app has **two half-merged design systems** — a warm neo-brutalist "Le Grand Voyage" palette (`src/lib/theme/tokens.css`: cream/ink/jaipur, hard `4px 4px 0` offset shadows) and a generic cool-blue glass system (`src/routes/layout.css` Layer B: `--fp-primary #2563eb`) layered on top. They collide (`--fp-muted` defined twice; slate wins), dark mode only covers the blue layer (warm surfaces are frozen light), icons are emoji (render differently per platform), and there are no shared component primitives (modal/banner/icon-button markup duplicated 4-5× each).

**User interview decisions (locked):**
- Aesthetic: **Indo-French fusion** — warm paper + deep indigo, marigold + jaipur rose accents, French serif display, fine jali-pattern details
- Theming: **system-follow + manual override** (the existing 3-way settings toggle stays; dark must become complete)
- Devices: **bespoke mobile AND desktop layouts** (sidebar desktop / bottom tabs mobile)
- Taste references: Apple (depth, restraint, fluid motion) + Duolingo (juicy feedback, celebration) + Airbnb/Notion (editorial calm)
- Scope: **full restructure allowed** (navigation shell, layout hierarchies) — features/flows identical, tests green
- Signature element: **the Voyage Map** — the India→Paris journey rendered as a route; home screen IS the brand
- Motion: **rich everywhere** (page transitions, ambient, micro-interactions) — reduced-motion fully honored
- Density: **balanced**
- Mascots: **keep Mira/Léo/Coco, redraw** to the new language (stay pure-CSS, zero assets)
- Icons: **custom inline SVG set** (no library, no emoji)

---

## Design Brief (the token system — single source of truth)

### Concept: "L'Indigo Express"

Indigo is the historically real Indo-French bridge: the dye India exported to Europe for centuries (nīl → French *indigo*). The design replaces the AI-default cream-and-terracotta warmth with **indigo ink on warm paper** by day and **indigo night lit by marigold** after dark — Diwali lamps meeting Paris streetlights. The learner's journey from India to Paris is the product; the palette IS that journey.

### Color (one unified token contract, both themes first-class)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--fp-ink` | `#232044` deep indigo | `#f2eee4` warm ivory | text, hairlines |
| `--fp-paper` | `#faf7f0` warm gallery white | `#16142b` indigo night | app background |
| `--fp-surface` | `#fffdf8` raised card | `#211e3d` lamplit card | cards, sheets |
| `--fp-rose` | `#dd5471` jaipur rose | `#ef7189` | PRIMARY actions (check, start, CTAs) |
| `--fp-marigold` | `#d99a2b` genda gold | `#f0b452` | progress, streaks, XP, celebration |
| `--fp-seine` | `#3a63d4` French blue | `#7d9bf0` | links, info, navigation accents |
| `--fp-sage` | `#6f9a60` | `#93bf83` | success/correct |
| `--fp-error` | `#c23d3d` | `#e57373` | incorrect/danger |

Supporting: `--fp-ink-soft`, `--fp-muted` (single definition — the collision dies), tint ramps via `color-mix()`. Kill entirely: Layer B (`--fp-primary/accent-cyan/accent-violet/glass/glow`), hard offset shadows, `--fp-terracotta/midnight/navy` (fold into indigo/rose). Elevation: 3 soft layered shadows (Apple-style, low alpha, indigo-tinted) + 1px `color-mix` hairline borders. Radii scale kept (`--fp-r-*`). Exam mode (`.fp-exam-mode`) re-pins accent to a formal slate-indigo.

### Typography

| Role | Face | Why |
|---|---|---|
| Display | **Fraunces variable** (`@fontsource-variable/fraunces`) | Warm, slightly wonky French soft-serif with optical sizing — distinctive where Instrument Serif has become a template face. Used with restraint: screen titles, the map, celebration numbers. |
| UI/body | **Manrope variable** (`@fontsource-variable/manrope`) | Already the app's voice; variable file replaces 5 static weights (smaller precache). |
| Figures/eyebrows | **DM Mono** (keep 400/500) | Timetable/ticket numerals — fits the Express metaphor. |
| Indic | **Tiro Devanagari Hindi** (keep) + existing per-script system fallbacks | Already correct and beautiful. |

Type scale: `clamp()`-based fluid display sizes; eyebrows in DM Mono uppercase with wide tracking (existing `.fp-eyebrow` pattern, recolored).

### Signature: the Voyage Map as a route

`src/lib/path/VoyageMap.svelte` rebuilt as an SVG journey: a dotted vintage-airline route line from a **Departure (India)** node through the existing CEFR cities (Marseille A1 → Lyon A2 → Bordeaux B1 → Strasbourg B2 → Paris C1), each city a custom line-art landmark medallion (no emoji), **Coco positioned at the learner's current point on the route**, route line filling with marigold as distance is covered, and a subtle jali-lattice texture behind the map. Desktop: horizontal route panorama. Mobile: vertical winding route. The active leg's unit nodes become ticket-stub styled stops. Route-draw animation on mount (skipped under reduced motion). **Must preserve:** `path-scene` + `unit-card` test-ids, `.fp-voyage-city-sublabel`, `.fp-beta-badge` (text 'Beta'), real `<a href*="/learn/...">` links.

### Structure & motion

- **Shell:** desktop = refined fixed sidebar (wordmark, custom SVG icon tabs, sync/offline status); mobile = frosted bottom tab bar with safe-area insets (`viewport-fit=cover` added to app.html + top inset handling). `<nav>` landmark and tab link names preserved.
- **Icons:** one `Icon.svelte` with an inline SVG path registry (nav ×4, play/listen, mic, check, lock, streak-flame, xp-spark, chevrons, close, share ≈ 16 glyphs), 1.75px stroke, drawn to match Fraunces' warmth.
- **Motion (rich, per user):** SvelteKit `onNavigate` view transitions between routes; button press-depth micro-interactions; map route-draw; flip-card polish; ONE consolidated celebration system; ambient idle motion on mascots (existing `fp-bob`, refined). Every animation gated by BOTH `prefers-reduced-motion` and the `.reduce-motion` html class (existing mechanism).
- **Jali restraint (the Chanel rule):** the lattice texture appears in exactly two places — behind the Voyage Map and as section-divider hairlines. Nowhere else.

### Self-critique pass (defaults avoided)

- The current app is literally AI-default cluster #1 (warm cream + serif display + terracotta accent). Escaped by: indigo ink replacing brown-black, tri-accent system (rose/marigold/seine) replacing single terracotta, Fraunces replacing the template serif, soft elevation replacing neo-brutalist offset shadows.
- City sequence markers are semantically true (CEFR progression IS a journey with order), so route staging is information, not decoration.
- Dark theme is not "invert the grays" — it's a designed second scene (indigo night / lamplit surfaces / brightened marigold).

---

## Hard Constraints (from exploration — non-negotiable)

1. **Every `data-testid` survives** (full inventory in exploration report; includes dynamic patterns `checkpoint-node-{id}`, `native-lang-{lang}`, `tier-{value}`, `preset-{value}`, `weak-skill-{skill}`).
2. **Non-testid e2e selectors survive:** heading named "FrenchPath"; links named "Back to path"/"Review now"; `<nav>` landmark with tab links (incl. Hindi सीखें); `aria-pressed` on shadow-toggle/shadow-play/shadow-loop/speak-record; `aria-live="polite"` on feedback; classes `.fp-beta-badge` + `.fp-voyage-city-sublabel`; html classes `/dark/` + `/reduce-motion/`; `[data-grade]` on grade buttons; backdrop `.fixed.inset-0.z-40`; `:enabled` semantics on inputs; `data-verdict` on speak chips.
3. **Asserted copy strings unchanged** in `messages/en.json`/`hi.json`: 'Lesson complete', '/ 50 XP', 'Checkpoint 1 (A1 Units 1–3)', 'Checkpoint passed', 'Not yet', 'Standard FSRS scheduling. Personalizes automatically after 500 reviews.', 'no new XP', 'Beta', 'avoir'/'उम्र', 'Your data stays yours|आपका डेटा', 'Continue|आगे'.
4. **CSP:** fonts ONLY via @fontsource/same-origin (`font-src` falls back to `default-src 'self'`); img-src 'self' data:; no external anything; do NOT touch the CSP directives themselves (headers.spec.ts asserts web/tauri parity — SPEC §3 HIGH).
5. **SPEC §3 invariants:** static SPA, zero new network, ≥44px touch targets (`min-h-11`), keyboard operable, aria-live, reduced-motion honored.
6. **i18n:** any new copy = new paraglide keys across all 10 locale files (real hi, placeholder + `docs/i18n-pending.md` entry for the rest — established convention).
7. **No contrast tests exist** — contrast is a manual DoD gate: all text ≥4.5:1 (≥3:1 large), both themes, checked before finish.

---

## Key verification findings (from sequencing review — trust these)

- **Font swap is tiny:** `'Instrument Serif'`/`'Manrope'` family names exist ONLY in `tokens.css` `--fp-font-*` vars (+ `@fontsource` imports in `+layout.svelte:19-29` + package.json). Variable-font family names are `'Fraunces Variable'` / `'Manrope Variable'`; import `wght-italic` for Fraunces (`.fp-quote-fr` uses italic).
- **Layer-B kill is value-level:** keep the `@theme inline` bridge and utility names (`bg-background`, `text-muted`…) forever; re-point the Layer-B `--fp-*` vars to the unified palette as aliases. 264 usages across 37 files reskin with zero component edits. Only 41 hardcoded raw-color utilities (`bg-blue-50`, `dark:bg-blue-950`, ambers) migrate per-screen in Phases 3–7.
- **`src/lib/path/PathScene.svelte` is dead code** (unimported, duplicate `data-testid="path-scene"`) — delete in Phase 3.
- **Theme color lives in 3 places to sync:** `src/lib/theme/apply.ts:3-4`, `+layout.svelte:115` meta, `vite.config.ts:63-64` manifest. `apply.spec.ts` asserts class logic only, not hexes — safe.
- **The `.fixed.inset-0.z-40` backdrop** e2e-asserted is the confidence-pulse modal in `learn/[unitId]/+page.svelte:436` (+ GlossText.svelte:87) — a Modal primitive must emit those literal classes for that consumer, else leave it inline.
- **Playwright webServer runs `npm run build && npm run preview`** — every full e2e gate is a production build; kill stale preview servers on :4173 between phases or you test old CSS.
- **Do not add/remove `<nav>` elements** — both navs are in the a11y tree at 1280px and `getByRole('navigation')` passes today; restyle only.
- Home `<h1>FrenchPath</h1>` is `lg:sr-only` — keep the element (heading-role assertion).
- `static/icon.svg` is Layer-B blue and `src/lib/share/shareCard.ts:32` hardcodes `#2563eb` in the canvas share card — both land in the Phase 9 sweep (PWA PNGs regen via `@vite-pwa/assets-generator`, already a devDep).
- **User decision: KEEP the WebGL 3D celebration scene** (threlte/three stay); consolidation restyles it, deletes nothing 3D.

---

## Implementation Phases (9 gates; app shippable + full suite green after each)

### Phase 1 — Unified token contract + fonts + theme plumbing (~8 files)
Rewrite `src/lib/theme/tokens.css`: new palette on `:root` + the missing `.dark` block for EVERY token (keep all var names — the 9 scoped `<style>` blocks and layout.css classes update for free); soft layered elevation replaces `4px 4px 0` offset shadows; hairline vars; new font stacks; `.fp-exam-mode` re-point + dark variant. Collapse Layer B in `src/routes/layout.css` into aliases onto the unified tokens (single `--fp-muted`; `@theme inline` bridge byte-identical); dark-triage hardcoded pastels inside layout.css (grade buttons :473-484, stat badges :381-388, stamps :544-551). Swap font packages (`@fontsource-variable/fraunces` + wght-italic, `@fontsource-variable/manrope`) in package.json + `+layout.svelte` imports. Sync theme color ×3. Add `viewport-fit=cover` to `src/app.html:7`.
**Gate:** check, lint, unit, full playwright + **first full manual light/dark contrast sweep of all 8 routes** (token values are the contrast decision point).

### Phase 2 — App shell, icon system, motion base (~6 files)
Create `src/lib/components/icons.ts` (SVG path registry) + `Icon.svelte` + `IconButton.svelte` (min-h-11, aria-pressed passthrough). Rebuild `+layout.svelte` shell visuals: refined sidebar + frosted bottom tabs with SVG icons (icons `aria-hidden`, labels stay text — no new i18n keys; keep both `<nav>` elements, `aria-current`, `offline-banner` testid). Add `onNavigate` view transitions (≤250ms, gated on `!reduce-motion` AND `document.startViewTransition`). Safe-area padding (top now too).
**Gate:** targeted `app`, `accessibility`, `settings` e2e → full suite.

### Phase 3 — Signature: VoyageMap + home (~5 files)
Rebuild `src/lib/path/VoyageMap.svelte` as the SVG journey: dotted route with `stroke-dashoffset` draw animation (motion-guarded), line-art landmark medallions replacing emoji, Coco marker at current position, jali `<pattern>` texture; keep horizontal-desktop/vertical-mobile duality. **Delete PathScene.svelte.** Polish home widget rail; extract `CocoCompanion.svelte` (home + progress dedupe).
**Preserve:** `path-scene` + `unit-card` testids on real `<a href="/learn/...">`, `.fp-beta-badge` (exact `m.beta_badge()` text), `.fp-voyage-city-sublabel`, locked-unit semantics, home `<h1>`.
**Gate:** targeted `progression`, `b1-unlock`, `checkpoint`, `app`, `celebration` → full suite.

### Phase 4 — Lesson flow (~18 files; biggest)
Order: `inputClass.ts` (single input restyle point, `:enabled` semantics intact) → `option-*`/`feedback-*`/`field-input` bodies in layout.css (kill hardcoded blues) → `LessonShell` (progress ring), `ExerciseChrome`, `CoachTip`, `XpFloat`, `LessonComplete` → `learn/[unitId]/+page.svelte` (feedback keeps `aria-live="polite"` + testid; confidence modal keeps literal `fixed inset-0 z-40`) → all 12 exercise components + `Exercise.svelte` → `ShadowingPlayer`/`RecordCompare` adopt IconButton (preserve `aria-pressed` on shadow-toggle/shadow-play/speak-record + all speak-*/shadow-* testids).
**Rule:** pure restyle — no testid/aria/string/control-flow edits.
**Gate:** full suite (most specs traverse lessons).

### Phase 5 — Review + Progress (~4 files)
`review/+page.svelte` (flip card mechanics + `grade-buttons`/`[data-grade]` intact), `progress/+page.svelte` (stat cards, heatmap, CocoCompanion), `fp-grade-btn` finalization.
**Gate:** targeted `review`, `fsrs-status` → full suite.

### Phase 6 — Settings + Onboarding + Modal/InfoBanner/BackLink (~7 files)
Create `Modal.svelte` (settings' 2 confirm dialogs; retrofit learn confidence modal ONLY if z-40 classes come through byte-identical), `InfoBanner.svelte` (amber banner ×4), `BackLink.svelte` (accessible name 'Back to path' via existing key). Restyle settings (857 lines — all testids + FSRS copy verbatim) and OnboardingWizard (7 steps; `onboarding-*` testids, data-sovereignty copy intact).
**Gate:** targeted `settings`, `onboarding`, `backup`, `sync` → full suite.

### Phase 7 — Exam mode + Checkpoint (~5 files)
Full `.fp-exam-mode` reskin (formal slate-indigo), `MockExamRunner.svelte` (body-class toggle untouched), `ExamTimer`, `checkpoint/[groupId]/+page.svelte`, exam wrappers if needed.
**Gate:** targeted `exam-b1`, `checkpoint` → full suite.

### Phase 8 — Mascots redraw + celebration consolidation (~8 files)
Redraw `characters.css` (new palette/proportions). Consolidate: `CelebrationOverlay.svelte` survives (owns `celebration-overlay`/`celebration-skip` testids + dialog semantics + reduce-motion kills incl. the `opacity:1 !important` rule); absorb AchievementToast's confetti/Coco/chips visuals keyed off `request.event`; **keep the lazy-loaded WebGL CelebrationScene, restyled to the new palette** (threlte/three stay); delete `AchievementToast.svelte` + home's `toAchievementEvent()` mapping (home passes `CelebrationRequest` straight through); trim `orchestrator.ts` + update `orchestrator.spec.ts`.
**Gate:** targeted `celebration`, `app`, `checkpoint`, `exam-b1` → full suite + unit.

### Phase 9 — Sweep + QA + spec-sync (~6 files)
Grep-kill remaining raw palette utilities (41 baseline, mostly consumed by 3–7) incl. `shareCard.ts:32` canvas gradient + offline-banner ambers; recolor `static/icon.svg` + regen PWA PNGs; delete now-dead CSS. **Exhaustive manual pass:** 2 themes × 360px/1280px × hi + ta locale font spot-check; contrast ≥4.5:1; reduced-motion walk-through. Run `frenchpath-spec-sync` (DoD).
**Gate:** `npm run check && npm run lint && npm run test:unit -- --run && npx playwright test && npm run spec:validate` + manual sign-off.

---

## Standing rules (every phase)

- **Contract freeze:** never rename/delete a testid, `aria-pressed`, `aria-live`, landmark, `data-grade`, `.fp-beta-badge`, `.fp-voyage-city-sublabel`, z-40/z-50 backdrop classes, or `<a href>` unit-link semantics.
- **Copy freeze:** e2e-asserted `messages/*.json` values are read-only; new copy = additive keys in all 10 locales (real hi, placeholders + `docs/i18n-pending.md` for the rest).
- **CSP freeze:** no CDN, no data: fonts, no new origins; new assets = inline SVG or @fontsource.
- **Dependency changes:** Phase 1 only (font packages).
- Commit per phase (conventional commits, no attribution footer). Copy this plan to `docs/superpowers/plans/2026-07-12-premium-ui-revamp.md` on approval.
