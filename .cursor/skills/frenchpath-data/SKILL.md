---
name: frenchpath-data
description: >-
  FrenchPath on-device data layer — IndexedDB, repositories, backup/restore,
  migrations, FSRS, gamification. Use when editing frenchpath/src/lib/db/,
  frenchpath/src/lib/pwa/, frenchpath/src/lib/srs/, frenchpath/src/lib/gamification/.
---

# FrenchPath Data Layer

All learner state lives in IndexedDB database `frenchpath`. No server sync.

## Required companion skill

Before backup, migration, or schema changes, read and follow:
`offline-data-safety` skill (validate-before-destroy, additive migrations, locked CSP).

## Architecture

- Schema types: `src/lib/db/schema.ts`
- DB open + upgrade: `src/lib/db/db.ts`
- Repositories: `src/lib/db/repositories/*` — thin CRUD only
- Pure domain logic (unit-tested in Node): `complete.ts`, `engine.ts`, `fsrs.ts`, `streak.ts`

## Object stores

| Store | Purpose |
|-------|---------|
| settings | uiLanguage, dailyGoal, targetRetention, theme, reduceMotion |
| progress | lessonId → status, score, bestCorrect, attempts |
| srsCards | FSRS-6 card state |
| reviewLog | Immutable review history (for future optimizer) |
| streak | currentStreak, freezesAvailable, freezesUsed |
| stats | Daily XP, lessons, reviews (keyed by date) |
| skillProfile | Per-skill CEFR estimates |

## Invariants

1. **Backup import**: validate (Zod) → verify checksum → migrate payload → then clear+write
2. **XP anti-farming**: `completeLesson` awards XP only on improvement delta via `bestCorrect`
3. **Streak**: `recordDailyActivity` only when `goalXp > 0` from lessons; reviews always count
4. **Review log**: append-only; never mutate historical entries
5. **Migrations**: additive first; backup file version registry in `src/lib/pwa/migrations.ts`

## FSRS

- Library: `ts-fsrs` (FSRS-6)
- Wrapper: `src/lib/srs/fsrs.ts`
- Review flow: `src/lib/srs/review.ts` → updates card + log + stats + streak

## Verification

```bash
npm run test:unit -- --run src/lib/db src/lib/pwa src/lib/srs src/lib/gamification
```

Use `fake-indexeddb` in tests; call `idb` transactions with `await tx.done`.

## Review gate

For data-layer PRs, run **pwa-data-reviewer** subagent before merge.
