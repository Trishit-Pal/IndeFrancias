# FrenchPath — Launch Checklist

Use before promoting a production deploy on Vercel (root directory: `frenchpath/`, output: `build/`).

## Automated (CI)

- [ ] `npm run check` — types clean
- [ ] `npm run lint` — formatting + ESLint
- [ ] `npm run test:unit -- --run` — unit tests green
- [ ] `npm run content:validate` — all packs valid
- [ ] `npm run content:proofread` — no QA flags
- [ ] `npm run build` — static build succeeds
- [ ] `npm run test:e2e` — Playwright journeys pass

## Manual — PWA & offline

- [ ] Lighthouse PWA audit ≥ 90 (Performance, Accessibility, Best Practices, PWA)
- [ ] Install on Chrome Android — add to home screen works
- [ ] Airplane mode: complete a lesson + SRS review after prior online visit
- [ ] Backup export → import round-trip on a real device (corrupt file rejected)

## Manual — UX & i18n

- [ ] Hindi UI toggle in Settings renders Devanagari correctly
- [ ] Hinglish UI smoke test on home + lesson
- [ ] Streak + freeze badges visible on home
- [ ] Progress page: 7-day XP chart, longest streak, skill bars after a lesson
- [ ] Beta disclaimer visible on first-run onboarding
- [ ] Record-and-compare works (microphone permission granted)

## Security & privacy

- [ ] No runtime analytics or third-party trackers
- [ ] CSP: no console violations on `/`, `/learn/*`, `/review`, `/settings` (E2E covers this)
- [ ] `vercel.json` / `static/_headers`: `microphone=(self)` for pronunciation

## Deploy

- [ ] Vercel project linked with `frenchpath` as root
- [ ] Custom domain configured (optional: `frenchpath.in`)
- [ ] `robots.txt` allows crawling
- [ ] OG meta tags present (see `+layout.svelte`)

## Post-launch

- [ ] Community call for native French proof-read
- [ ] Track feedback without cloud analytics (GitHub issues, manual reports)
- [ ] See [ml-roadmap.md](./ml-roadmap.md) for V1 ML features
