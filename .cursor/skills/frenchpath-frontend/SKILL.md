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

- Mobile-first layout: `max-w-xl mx-auto px-4 py-6`
- Imports: `$lib/...`, `$app/paths` `resolve()` for internal links
- Add `data-testid` on interactive elements targeted by Playwright (`e2e/app.e2e.ts`)
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
npm run test:e2e   # if routes/exercises changed
```

## Key files

| Area | Path |
|------|------|
| Home / path map | `src/routes/+page.svelte` |
| Lesson player | `src/routes/learn/[unitId]/+page.svelte` |
| Review | `src/routes/review/+page.svelte` |
| Progress | `src/routes/progress/+page.svelte` |
| Settings | `src/routes/settings/+page.svelte` |
| Onboarding | `src/lib/components/Onboarding.svelte` |
