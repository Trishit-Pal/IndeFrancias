---
name: frenchpath-frontend
description: >-
  FrenchPath UI work — Svelte 5 routes, exercise components, Paraglide i18n,
  Tailwind, onboarding, accessibility. Use when editing frenchpath/src/routes,
  frenchpath/src/lib/components, frenchpath/src/lib/lesson/exercises, or messages/*.json.
---

# FrenchPath Frontend

Offline-first French-learning PWA for Indian learners. All UI lives under `frenchpath/`.

## Stack

- SvelteKit 2 + **Svelte 5 runes** (`$state`, `$derived`, `$props`, `$bindable`)
- Tailwind CSS v4 (`src/routes/layout.css`)
- Paraglide i18n: `en`, `hi`, `hinglish` — import via `$lib/paraglide/messages`
- Static prerender + client SPA fallback

## Conventions

- **Responsive:** mobile-first; bottom nav below `lg`; sidebar nav at `lg+` (≥1024px). Main content uses responsive max-width (`max-w-xl md:max-w-2xl lg:max-w-4xl` patterns). Home unit cards: 2-col grid at `md+`.
- **Theme:** semantic tokens in `layout.css` (`bg-background`, `bg-card`, `text-foreground`, etc.). Apply via `src/lib/theme/apply.ts` — settings `theme`: `system` | `light` | `dark`. Dark mode is **high-contrast OLED** (near-black bg). Never hardcode `bg-white`/`text-slate-900` without a `dark:` pair or token.
- Imports: `$lib/...`, `$app/paths` `resolve()` for internal links
- Add `data-testid` on interactive elements targeted by Playwright — see `docs/testing.md` §3.1
- Exercise components live in `src/lib/lesson/exercises/`; orchestrated by `Exercise.svelte`
- Never add runtime API calls — app is fully offline

## i18n

When adding user-visible strings:

1. Add key to `messages/en.json`, `messages/hi.json`, `messages/hinglish.json`
2. Use `m.key_name()` in components
3. Run dev/build so Paraglide regenerates

## Accessibility

- Touch targets ≥ 44px on buttons
- `aria-label` on icon-only controls
- `role="status"` + `aria-live="polite"` on exercise feedback
- Respect `reduceMotion` from settings for transitions
- Test keyboard: Tab through MCQ options, Enter to submit

## Verification

From `frenchpath/`:

```bash
npm run check
npm run lint
npm run test:e2e   # if routes/exercises/settings changed
```

E2E files: `e2e/app.e2e.ts`, `backup.e2e.ts`, `progression.e2e.ts`, `settings.e2e.ts`, `review.e2e.ts`, `accessibility.e2e.ts`. Helpers: `e2e/helpers.ts`.

Accessibility E2E: keyboard MCQ + review grade focus (`accessibility.e2e.ts`).

## Key files

| Area | Path |
|------|------|
| Home / path map | `src/routes/+page.svelte` |
| Lesson player | `src/routes/learn/[unitId]/+page.svelte` |
| Review | `src/routes/review/+page.svelte` |
| Progress | `src/routes/progress/+page.svelte` |
| Settings | `src/routes/settings/+page.svelte` (backup preview, `data-testid` contract) |
| Onboarding | `src/lib/components/Onboarding.svelte` |
| Theme apply | `src/lib/theme/apply.ts` |
| Design tokens | `src/routes/layout.css` |
