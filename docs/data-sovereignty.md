# FrenchPath — Data Sovereignty

FrenchPath is an **offline-first, account-free** French learning PWA. Learner data never leaves the device unless the learner explicitly exports it.

## Principles

1. **On-device by default** — Progress, FSRS cards, review logs, streaks, XP, settings, and assessment records live in IndexedDB (`frenchpath` database, version 2).
2. **No telemetry at launch** — No analytics SDK, no crash reporter, no third-party trackers in the production bundle.
3. **Portable backup** — Learners can export a versioned JSON backup (schema v3) with SHA-256 checksum from Settings. Import validates checksum and schema **before** any destructive write.
4. **Opt-in sync only (future)** — Cloud sync stubs use E2EE envelope types; sync remains disabled until explicitly enabled by the learner post-launch.
5. **Local share cards** — Progress sharing renders a PNG on-device via Canvas; Web Share API or download only. No server upload.

## What is stored locally

| Store | Contents | Sensitivity |
|-------|----------|-----------|
| `settings` | UI language, native language, goals, difficulty tier, celebration prefs | Low |
| `progress` | Lesson completion, scores, attempts | Medium |
| `srsCards` | FSRS scheduling state | Medium |
| `reviewLog` | Append-only review history | Medium |
| `streak` / `stats` | Gamification aggregates | Low |
| `skillProfile` | Estimated CEFR per skill | Low |
| `assessments` | Checkpoint / milestone / DELF results | Low |

## Backup trust boundary

Imported JSON is **untrusted input**. The import pipeline:

1. Size limit (5 MB)
2. JSON parse
3. Schema version + checksum (v3)
4. Zod strict validation (`backupSchema.ts`)
5. Single transaction: clear all stores → write validated payload

A failed import **never** clears existing data.

## Learner controls

- Export backup anytime (Settings → Storage & backup)
- Reset all progress (destructive, confirmed)
- Re-run onboarding without losing data
- Disable celebrations / reduce motion
- Toggle revision notifications (browser permission, opt-in)

## Content vs learner data

Lesson JSON packs ship with the app (static assets). They contain no PII. AI-authored French content is validated at build time (`content:validate` on all 58 units; `content:proofread:launch` on A1/A2 for release). B1–C1 template packs may fail full `content:proofread` until human curation — see [content-curation.md](./content-curation.md).

## Related docs

- [Testing guide](./testing.md)
- [Content curation (B1–C1 launch gate)](./content-curation.md)
- [Data safety hardening spec](./superpowers/specs/2026-06-08-data-safety-security-retention-hardening-design.md)
