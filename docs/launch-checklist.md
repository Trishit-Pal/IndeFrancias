# FrenchPath — Launch Checklist

Use before promoting a production deploy on Vercel (root directory: `frenchpath/`, output: `build/`).

## Automated (CI)

- [ ] `npm run check` — types clean
- [ ] `npm run lint` — formatting + ESLint
- [ ] `npm run test:unit -- --run` — **185** unit tests green (see [testing.md](./testing.md))
- [ ] `npm run content:validate` — all packs valid
- [ ] `npm run content:proofread:launch` — A1/A2 proofread clean ([content-curation.md](./content-curation.md); B1–C1 templates may fail full proofread)
- [ ] `npm run build` — static build succeeds
- [ ] `npm run test:e2e` — **35** Playwright journeys green (backup round-trip, progression, checkpoint, CSP on 9 routes)

Key automated regressions (detail in [testing.md](./testing.md)):

- Backup: tampered checksum / malformed JSON never wipe existing data
- XP: replaying a perfect lesson awards no new goal XP
- Unit lock: direct URL to locked unit shows blocked screen
- Headers: `headers.spec.ts` asserts `vercel.json` + `static/_headers`

## Manual — PWA & offline

- [ ] Lighthouse PWA audit ≥ 90 (Performance, Accessibility, Best Practices, PWA)
- [ ] Install on Chrome Android — add to home screen works
- [ ] Airplane mode: complete a lesson + SRS review after prior online visit
- [ ] Backup export → import round-trip on a real device (corrupt file rejected; preview modal shown before replace)

## Manual — UX & i18n

- [ ] Hindi UI toggle in Settings renders Devanagari correctly
- [ ] Hinglish UI smoke test on home + lesson
- [ ] Streak + freeze badges visible on home
- [ ] Progress page: 7-day XP chart, longest streak, skill bars after a lesson
- [ ] Beta disclaimer visible on first-run onboarding
- [ ] Record-and-compare works (microphone permission granted)

## Security & privacy

- [ ] No runtime analytics or third-party trackers
- [ ] CSP: no console violations on `/`, `/learn/a1-unit-01`, `/review`, `/progress`, `/settings`, `/exam/delf-a2`, `/exam/delf-b1`, `/exam/delf-b2`, `/exam/dalf-c1` (E2E covers this)
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
