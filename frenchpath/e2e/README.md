# FrenchPath E2E tests

Playwright scenarios run against the **production preview** (`npm run build && npm run preview` on port 4173).

## Files

| File                   | Scenarios | Focus                                                                                |
| ---------------------- | --------- | ------------------------------------------------------------------------------------ |
| `app.e2e.ts`           | 9         | Core journeys: lesson, persistence, SRS, PWA, offline, exam, CSP, i18n, XP anti-farm |
| `backup.e2e.ts`        | 4         | Export → reset → import; corrupt import; last-export UI; reset → onboarding          |
| `progression.e2e.ts`   | 3         | Locked URL; unit unlock; DELF gate                                                   |
| `settings.e2e.ts`      | 4         | Theme, daily goal, reduce motion, data-local notice                                  |
| `review.e2e.ts`        | 2         | Empty queue; due badge                                                               |
| `accessibility.e2e.ts` | 2         | Keyboard MCQ; review grade focus                                                     |
| `helpers.ts`           | —         | `gotoHome`, `completeLesson`, `exportBackupViaSettings`, `importBackupFile`          |

## Run

```bash
npm run test:e2e                              # all 24
npx playwright test e2e/backup.e2e.ts         # one file
npx playwright test --grep "backup round-trip"  # one scenario
```

## Conventions

- Add `data-testid` in Svelte before asserting UI (see `docs/testing.md` §3.1).
- Dismiss onboarding via `gotoHome()` unless testing first-run or post-reset flows.
- After backup import, navigate home via the **Learn** nav link (reload stays on `/settings`).

Full workflows and security matrix: [docs/testing.md](../../docs/testing.md).
