---
name: FrenchPath
description: L'Indigo Express — indigo ink on warm paper by day, indigo night lit by marigold after dark; a Mumbai→Paris journey for offline French learners.
colors:
  canvas: "#faf7f0"
  paper: "#fffdf8"
  cream: "#f4f0e5"
  paper-warm: "#efe9da"
  ink: "#232044"
  ink-soft: "#3d3963"
  muted: "#615c84"
  jaipur: "#dd5471"
  jaipur-text: "#c23a58"
  jaipur-hover: "#ad3350"
  jaipur-light: "#fcedf0"
  saffron: "#d99a2b"
  saffron-text: "#8f5e0e"
  sage: "#6f9a60"
  sage-text: "#4a7340"
  seine: "#3a63d4"
  seine-text: "#2b4fae"
  seine-light: "#dde6f8"
  terracotta: "#bf5f45"
  navy: "#2e2b52"
  ivory: "#f2eee4"
  error: "#c23d3d"
  on-error: "#ffffff"
  on-primary: "#ffffff"
typography:
  display:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: "clamp(2rem, 1.5rem + 2vw, 3.25rem)"
    fontWeight: 460
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: "clamp(1.5rem, 1.25rem + 1vw, 2.25rem)"
    fontWeight: 460
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.1
  body:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  figure:
    fontFamily: "DM Mono, Courier New, monospace"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  timetable:
    fontFamily: "DM Mono, Courier New, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.12em"
  gloss:
    fontFamily: "Tiro Devanagari Hindi, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.jaipur-text}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.jaipur-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "44px"
  icon-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    size: "44px"
  icon-button-pressed:
    backgroundColor: "{colors.jaipur-light}"
    textColor: "{colors.jaipur-text}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  field-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "44px"
  skill-chip:
    backgroundColor: "{colors.jaipur-light}"
    textColor: "{colors.jaipur-text}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  nav-item-active:
    backgroundColor: "{colors.jaipur-light}"
    textColor: "{colors.jaipur-text}"
    rounded: "8px"
    padding: "8px 12px"
  exam-header:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.lg}"
    padding: "16px 22px"
---

# Design System: FrenchPath

## Overview

**Creative North Star: "L'Indigo Express"**

A night train from Mumbai to Paris, recorded in a traveller's journal: indigo ink on warm paper by day, and after dark the same indigo as a night sky lit by marigold lamps. Everything is drawn, stamped or hand-set rather than rendered: the route is an ink line, the icons are 1.75px line-art strokes, the characters are flat ink-outlined paper cut-outs, decoration is a faint jali lattice at 8% ink. Jaipur rose is the single action colour; marigold (saffron) is reserved for progress, XP and streaks; Seine blue and sage stand for info and success; terracotta belongs to Mira.

The product operates in earned-familiarity mode: forms, buttons, settings and nav are ordinary, legible product affordances built with the world's materials. The brand lives in the details (a serif city name, a mono timetable label, a marigold route drawing itself in) rather than in layout gymnastics. Density is comfortable and single-column; the first viewport on the home screen is "today's stop" and the route to it. Dark mode is a designed second scene, not inverted greys.

Confirmed rejections (PRODUCT.md anti-references, borne out by the code): no glassmorphism, neon or gradient chrome; no coercive motion or guilt UI; no emoji glyphs as icons in the chrome.

**Key Characteristics:**
- One token contract (`--fp-*`) with light and dark values for every role; tints are `color-mix()` against paper, never second palettes.
- Accent tokens are fills; text always uses the `-text` sibling (AA enforced by `contrast.spec.ts`).
- Fraunces for moments, Manrope for tasks, DM Mono for figures and timetable labels, Tiro Devanagari Hindi for glossed native text.
- Soft indigo-tinted elevation in three steps; no hard offsets, no glows on chrome.
- One authored motion moment (the route ink draw-in); everything else is a 100–280ms state transition, silenced by `.reduce-motion` and the OS query alike.
- Signature element: the measured SVG VoyageMap with the marigold "train" marker arriving at today's stop.

## Colors

Warm paper and deep indigo ink carry the whole page; rose acts, marigold rewards, blue informs, sage confirms. Light values are listed in the frontmatter; the night palette is a full re-pin on `.dark` (sidecar `colorMeta.*.dark`).

### Primary
- **Jaipur Rose** (`jaipur`): the accent as a fill, stroke or tint source — progress fill in the lesson bar, skill-chip borders, hover borders, the Lyon node. Only 3.76:1 on white, so it never carries text.
- **Jaipur Rose Ink** (`jaipur-text`): the same rose cut deeper for anything legible — primary button fill under white text (5.2:1), rose labels, active nav text, pressed icon buttons. This is what `--fp-primary` resolves to in light mode.
- **Jaipur Rose Hover** (`jaipur-hover`): primary button hover fill.
- **Rose Wash** (`jaipur-light`): the rose tint surface for selected options, active sidebar item, skill chips, pressed icon buttons. Holds `jaipur-text` at AA.

### Secondary
- **Marigold** (`saffron`) / **Marigold Ink** (`saffron-text`): progress, XP, streaks, the route's drawn-in ink and train marker, the offline banner, the "note" InfoBanner. Fill 2.4:1 as text — always use the ink cut for words.
- **Seine Blue** (`seine`) / **Seine Ink** (`seine-text`) / **Seine Wash** (`seine-light`): links, info, Léo, dictation waveform bars, the "ice" stat badge, the Easy grade.
- **Sage** (`sage`) / **Sage Ink** (`sage-text`): correct answers, completed states, the Good grade, the "Admis" stamp.

### Tertiary
- **Terracotta** (`terracotta`): Mira's colour and a warm supporting accent (Paris node). Supported legacy alias; do not extend its roles.
- **Formal Slate** (`navy`) + **Ivory** (`ivory`): exam mode. `.fp-exam-mode` re-pins `--fp-jaipur`/`--fp-primary` to slate so DELF/DALF runs lose the playful rose; the exam header stays a dark slate panel with theme-fixed ivory text in both themes.
- **Error** (`error`) / **On Error** (`on-error`): incorrect answers, danger, the "Recalé" stamp, the Again grade.

### Neutral
- **Canvas** (`canvas`): app background, warm gallery white; also the PWA `theme-color`.
- **Paper** (`paper`): every card, raised surface, input and the nav at 92% alpha.
- **Cream** (`cream`) and **Warm Paper** (`paper-warm`): inset backgrounds, progress-bar tracks, skeletons, the empty part of the goal ring.
- **Indigo Ink** (`ink`): headings, body on cards, focus outlines, hairlines at 15% (18% at night), the jali lattice at 8%.
- **Soft Ink** (`ink-soft`): body text and icon-button glyphs.
- **Muted** (`muted`): secondary labels, timetable labels, inactive nav. Single source; the only grey-ish role.
- **Border**: `color-mix(ink 15%, paper)`; **Hairline**: `color-mix(ink 15%, transparent)`; **Disabled**: `color-mix(ink 25%, canvas)`.

### Named Rules
**The Fill/Ink Rule.** Rose, marigold, sage and Seine are fills. Any word set in those hues uses the `-text` sibling; `contrast.spec.ts` fails the build if a text token drops below 4.5:1 on canvas or paper in either theme.

**The Mixed-Tint Rule.** Status surfaces are never new hexes: correct = sage 16% in paper, incorrect = error 14%, note = saffron 14%, info = Seine 12%, fire badge = saffron 18%. Because the mix is against `--fp-paper`, the same rule produces the night version for free.

**The One Action Colour Rule.** Rose is the only colour that means "do this". Marigold means "you earned this", never "click here".

## Typography

**Display Font:** Fraunces Variable (with Georgia, serif) — optical sizing on, weights 460–560 in use, italic for French quotes.
**Body Font:** Manrope Variable (with system-ui, sans-serif).
**Label/Mono Font:** DM Mono 400/500 (with Courier New) for figures, timetable labels and CEFR codes.
**Gloss Font:** Tiro Devanagari Hindi 400 (+ italic) for glossed Hindi/Marathi; other Indic scripts fall back to the system Noto Serif per `html[lang]`.

**Character:** a hand-set travel journal — a soft, slightly flared serif for the moment that matters (today's city, the lesson complete, the exam stamp), a quiet geometric sans for everything you have to read and tap, and a typewriter mono for the ticket figures. All fonts are self-hosted via `@fontsource` because the CSP is `default-src 'self'`.

### Hierarchy
- **Display** (Fraunces 460, `clamp(2rem, 1.5rem + 2vw, 3.25rem)`, 1.05, -0.01em): page-level moments only (`.fp-display-lg`).
- **Headline** (Fraunces 460, `clamp(1.5rem, 1.25rem + 1vw, 2.25rem)`, 1.1): section moments (`.fp-display-md`).
- **Title** (Fraunces 500, 24px, 1.1, `text-wrap: balance`): today's city in the VoyageMap hero, exam title; the sidebar wordmark is the same face at 560/1.05rem.
- **Body** (Manrope 400, 16px, 1.5): all reading copy; `line-height: 1.65` when `html[lang]` is an Indic script.
- **Label** (Manrope 500–600, 12–14px): nav labels, chips, input labels; buttons are Manrope 800/15px (primary) and 600 (secondary).
- **Figure** (DM Mono, tabular-nums, 0.02em): stat numbers (32px/1 in `.fp-stat-num`), leg counts, goal-ring value.
- **Timetable label** (DM Mono 500, 9–11px, uppercase, tracked): city sub-labels (CEFR level), stat labels, beta badges, the exam header's "DELF" line. Tracking varies by context in the build — 0.12em (`.fp-eyebrow`), 0.18em (`.fp-stat-lbl`), 0.24em (`.fp-exam-eyebrow`); treat 0.12em as the default and the wider cuts as exam/stat-specific.

### Named Rules
**The Moments Rule.** Fraunces appears where the learner pauses: a city name, a completed lesson, a stamp, a French quotation. Task text, buttons and settings are Manrope. If a surface has more than one Fraunces element per viewport, one of them is wrong.

**The Timetable Rule.** Mono uppercase labels name data (a CEFR band, a stat, a mode), always paired with the figure or title they describe. They are not kickers above headings.

## Layout

Mobile-first, single editorial column. `.page-shell` is `max-width 36rem` (576px) with 16px side padding and 24px top padding; from 768px it widens to 42rem (672px) and 24px padding; from 1024px an unlayered `main { max-width: 960px }` rule is the single source of truth for column width (do not add competing `lg:` utilities). Navigation is a fixed bottom tab bar below 1024px (four tabs, 44px min-height, paper at 92% alpha with an 8px blur that is dropped under reduced motion, safe-area padded) and a fixed 256px left sidebar at 1024px and above; content gets `lg:ml-64`.

Spacing follows Tailwind's 4px grid as actually used: 4/6/8 for gaps inside chips and badges, 10–14 for compact card padding (`.fp-lesson-node` 11px 13px, `.fp-data-card` 14px 16px), 16 for standard card padding, 20–24 for button and panel horizontal padding. Cards stack with 14–16px between them. The VoyageMap is a horizontal rail on wide screens and a vertical alternating rail (`fp-row-left/right`) on narrow screens.

A skip link (`.btn-secondary`, visible on focus), an `aria-live="polite"` route announcer and focus-to-`#main` after navigation are part of the shell on every page.

## Elevation & Depth

Hybrid: tonal layering first (canvas → paper → cream/warm-paper insets), with soft, indigo-tinted ambient shadows in three steps. There are no hard offset shadows and no glows on chrome; the only `drop-shadow` filters are on the route ink and the train marker inside the SVG map. At night the shadow colour switches to black at higher alpha because indigo tint vanishes on indigo.

### Shadow Vocabulary
- **Elevation 1** (`box-shadow: 0 1px 2px rgb(35 32 68 / 0.05), 0 1px 3px rgb(35 32 68 / 0.07)`): resting buttons, grade buttons, city nodes, goal ring.
- **Elevation 2 / card** (`0 2px 4px rgb(35 32 68 / 0.05), 0 6px 16px rgb(35 32 68 / 0.09)`): `.surface-card`, stat cards, hero, exam header, map rail; also the hover step for buttons.
- **Elevation 3 / float** (`0 4px 8px rgb(35 32 68 / 0.06), 0 16px 32px rgb(35 32 68 / 0.14)`): modal panel only.
- **Ring** (`.fp-path-glow`: `0 0 0 2px var(--fp-primary)` + elevation 2): the current path node.
- **Night** values: `rgb(0 0 0 / 0.25–0.45)` at the same offsets.

### Named Rules
**The Press-Flat Rule.** Every raised control loses its shadow on `:active` and drops 1px (`translateY(1px)`); hover goes one elevation step up. The surface behaves like paper being pressed, not a button lighting up.

**The Hairline Rule.** Separation inside a surface is a 1px ink hairline at 15% (`.fp-hairline`, `--fp-border`), never a second shadow or a full-contrast line.

## Shapes

Generous, soft rounding on a six-step scale: 12 / 16 / 20 / 24 / 32px and pill. Controls are pills (both button variants, icon buttons, chips, stat badges, progress tracks); content surfaces are 24px (`.surface-card`, hero, map rail); fields, lesson nodes, banners and skeletons are 16px; the exam header is 20px. Circles mark places: city nodes, the hero glyph, the goal ring, the 54px exam badge. Borders are everywhere 1px in `--fp-border`; the only heavier strokes are the 1.5px ink ring on the lesson progress track, the 2px ivory exam badge, the 3px rotated result stamps, and the 2px ink outlines on the CSS-only characters. Two off-scale radii exist in the build — grade buttons at 14px and the sidebar nav item at 8px (`rounded-lg`) — recorded as-is, not as a rule.

Icons are a hand-drawn registry (`icons.ts`, ~40 glyphs): 24×24 viewBox, `stroke="currentColor"`, 1.75px, round caps and joins, `aria-hidden` by default. The jali lattice (a repeating SVG tile at 8–10% ink) is the one permitted texture behind the route.

## Components

### Buttons
- **Shape:** pill (999px), 44px minimum height, inline-flex centred.
- **Primary** (`.btn-primary`): Jaipur Rose Ink fill with white text, Manrope 800/15px, 14px 24px padding, elevation 1. Exam mode re-pins the fill to Formal Slate.
- **Hover / Focus:** hover to `jaipur-hover` + elevation 2; `:active` translateY(1px) and shadow removed; focus `outline: 2px solid var(--fp-ink)` offset 2px; disabled 60% opacity, `not-allowed`.
- **Secondary** (`.btn-secondary`): paper fill, ink text, 600 weight, 1px border, 12px 20px padding; hover turns the border rose; same focus and disabled treatment. Also used for the skip link and lesson exit.
- **Icon button** (`IconButton`): 44×44 pill, paper fill, soft-ink glyph; hover border and glyph go rose; `aria-pressed="true"` fills Rose Wash with rose-ink glyph and border; `:active` scale 0.94 (none under reduce-motion). Always carries `aria-label`.
- **Grade buttons** (`.fp-grade-btn`): 44px min, 14px radius, Manrope 800/14px, elevation 1; Again/Hard/Good/Easy tinted error 14% / saffron 16% / sage 16% / Seine 14% in paper; same press-flat behaviour.

### Chips
- **Skill chip** (`.fp-skill-chip`): pill, Rose Wash fill, rose-ink text, border rose at 45%; uppercase 12px semibold.
- **Stat badge** (`.fp-stat-badge`): pill, 5px 10px, 12px/700, 1px border; `--fire` saffron 18% in paper with Marigold Ink text, `--ice` Seine Wash with Seine Ink text.
- **Beta badge**: DM Mono 9px/500, 0.1em, uppercase, 1px 6px.

### Cards / Containers
- **Corner Style:** 24px (`.surface-card`); 16px for stat cards and lesson nodes.
- **Background:** paper; `.fp-data-card` (settings sovereignty) inverts to ink fill with paper text.
- **Shadow Strategy:** elevation 2 at rest; unit cards lift 2px on hover.
- **Border:** 1px `--fp-border`.
- **Internal Padding:** 16px standard; 20px (`p-5`) in the modal panel.

### Inputs / Fields
- **Style** (`.field-input`): paper fill, ink text, 1px border, 16px radius, 44px min height, 8px 12px padding.
- **Focus:** `outline 2px` in `--fp-primary` (rose ink) offset 2px; hover border darkens to ink 30%. Note: fields and nav focus in rose, buttons focus in ink — two conventions in the build.
- **Option states:** default paper with border; selected = Rose Wash + rose border; correct = sage 16% + sage border; incorrect = error 14% + error border. Text stays ink in all states.

### Navigation
- Bottom tab bar (< 1024px): four stacked icon-and-label tabs, Manrope 500/12px, muted at rest, rose ink when `aria-current="page"`, 21px icons, paper at 92% alpha with 8px backdrop blur (removed under reduced motion).
- Sidebar (≥ 1024px): 256px, paper fill, right border; items 44px min, 8px radius, 19px icons, Manrope 500/14px; active = Rose Wash + rose ink; hover = cream fill + ink text.
- Wordmark: Fraunces 560, 1.05rem, beside a 36px app icon.

### Dialogs and Banners
- **Modal**: native `<dialog>` + `showModal()` (inert background, Escape, focus restore); panel is a `.surface-card` at `max-w-md`, elevation 3, 280ms ease-out rise-in; backdrop is a literal night scrim `color-mix(#100e20 55%, transparent)` with 2px blur because older WebViews do not inherit custom properties into `::backdrop`.
- **InfoBanner**: 16px radius, 10px 14px padding, 13px/1.4; `note` saffron tint + Marigold Ink, `info` Seine tint + Seine mixed 72% into ink, `error` error tint + error text. Decorative by default; pass `role` when the copy warrants it.
- **Offline banner**: saffron 15% strip, Marigold Ink 12px text, safe-area padded.

### Loading
- **Skeleton** (`.fp-skeleton`): warm-paper block, 16px radius, 1.4s opacity pulse to 0.55; placeholders take the content's own shape — no spinners.

### VoyageMap (signature)
The home screen's first viewport. A hero card (paper, 24px radius, elevation 2) names today's stop in Fraunces 24px beside a 48px circular glyph tinted 20% in the city's colour, a 6px warm-paper leg bar with a marigold fill, and a full-width primary CTA ("Next: lesson title"). Below it, the route rail: a jali lattice at 8% ink, a dotted ink base path (`stroke-dasharray 0.0001 0.04` with round caps = one dot every 4% of the route), and a 3px marigold progress path with `pathLength="1"` that draws in from 0 to the learner's fraction over 1.2s `--fp-ease-out` on mount, carrying a marigold "train" marker to today's city. City nodes are 1px-bordered paper circles with line-art landmark glyphs; done/active nodes mix the city colour 20% into paper, the active one pulses (`.fp-pulse`, 1.8s) and locked ones stay muted. Each level owns a colour: Marseille sage, Lyon rose, Bordeaux marigold, Strasbourg Seine, Paris terracotta, Mumbai marigold. Lesson nodes are real `<a>` links. Under `.reduce-motion` the route starts fully revealed with no transition.

### Characters
Mira (terracotta), Léo (Seine) and Coco are CSS-only paper cut-outs: absolutely positioned divs with 2px ink outlines, sized 28–200px, animated by `fp-bob` (4s) / `fp-flutter` (2.6s) / `fp-blink` idle loops that are stopped by both reduce-motion paths.

### Motion grammar
Tokens: `--fp-ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--fp-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`, `--fp-duration-fast: 150ms`, `--fp-duration-normal: 280ms`. One authored moment: the route ink draw-in (1.2s). Everything else is a state transition — 100ms press, 150ms border/colour, 280ms fade-up/bounce-in, 60ms stagger capped at 8 items — plus a cross-fade view transition between routes. Idle loops are limited to characters, the active city/lesson pulse, the TTS pulse and the dictation waveform. Both `html.reduce-motion` (Settings toggle) and `prefers-reduced-motion` zero every animation and transition, skip view transitions, and remove the nav blur.

## Do's and Don'ts

### Do:
- **Do** take every colour from `--fp-*` tokens and build status surfaces with `color-mix()` against `--fp-paper`, so dark mode needs no `.dark` variants.
- **Do** use the `-text` cut (`--fp-jaipur-text`, `--fp-saffron-text`, `--fp-sage-text`, `--fp-seine-text`) for any coloured word, and add new text tokens to `contrast.spec.ts`.
- **Do** keep interactive targets at 44px minimum (`min-h-11`, `.btn-*`, `IconButton`, `.fp-grade-btn`) with a visible 2px focus outline offset 2px.
- **Do** draw new icons into `icons.ts` as 24×24 line-art at 1.75px with round caps; render through `Icon.svelte`.
- **Do** reuse `Modal`, `InfoBanner`, `IconButton`, `.surface-card`, `.btn-primary`/`.btn-secondary` and `.field-input` instead of restyling.
- **Do** gate every animation and transition behind `html:not(.reduce-motion)` or the component's reduce-motion branch, and give it a reduced-motion end state (revealed, not hidden).
- **Do** set the Indic font cascade on the token (`--fp-font-ui`, `--fp-font-hindi` under `html[lang]`), not with a competing `font-family` rule.

### Don't:
- **Don't** use `--fp-jaipur`, `--fp-saffron` or `--fp-sage` as text; the raw fills are 3.76:1, 2.4:1 and 3.2:1.
- **Don't** add glass, neon, gradient fills or glows to chrome; the only blur is the mobile nav (dropped under reduced motion) and the dialog scrim.
- **Don't** add hard offset shadows or shadows beyond the three elevation steps.
- **Don't** load fonts or icons from a CDN; the CSP (`default-src 'self'`) silently drops them.
- **Don't** make marigold mean "action" or rose mean "reward"; rose acts, marigold rewards.
- **Don't** add a competing `lg:`/`xl:` `max-w-*` to `.page-shell`; the unlayered `main` rule owns width at ≥1024px.
- **Don't** add new roles to the legacy aliases `--fp-terracotta`, `--fp-navy`, `--fp-primary*`; they are kept for live users, not extended.
- **Don't** use guilt, urgency or streak-shaming in motion or copy; celebrate progress (`CelebrationOverlay`, `fp-stamp`), never punish absence.
