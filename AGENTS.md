# FrenchPath — Agent Routing

This repo is the **FrenchPath** offline-first French-learning PWA (`frenchpath/`). Use project skills in `.cursor/skills/` for domain-specific work.

## Quick start

```bash
cd frenchpath
npm install
npm run dev          # http://localhost:5173
npm run test:unit -- --run
npm run test:e2e
```

## Skill routing

| Task | Primary skill | Review subagent |
|------|---------------|-----------------|
| UI, routes, exercises, i18n, a11y | `frenchpath-frontend` | `code-reviewer` |
| Lesson JSON, syllabus, content generation | `frenchpath-pipeline` | — |
| IndexedDB, backup, FSRS, streaks, XP | `frenchpath-data` | `pwa-data-reviewer` |
| CSP, headers, backup import safety | `frenchpath-security` | `security-review` |
| Tests, E2E journeys, regression | `docs/testing.md` | domain reviewer per area |
| Multi-layer feature | `subagent-driven-development` | domain reviewer + `code-reviewer` |

## Architecture (one line)

Static SvelteKit PWA → client IndexedDB → pure domain logic (Node-tested) → JSON content packs.

## Non-negotiables

- **No runtime backend** — no accounts, no cloud sync at launch
- **No in-app AI** — AI is build-time content drafting only
- **Offline-first** — core flows work without network after install
- **Data safety** — follow `offline-data-safety` skill for any IndexedDB/backup change

## Key docs

- Product README: `frenchpath/README.md`
- **Testing & regression:** `docs/testing.md` (119 unit + 24 E2E, workflows, security matrix)
- Data hardening spec: `docs/superpowers/specs/2026-06-08-data-safety-security-retention-hardening-design.md`
- ML roadmap (post-launch): `docs/ml-roadmap.md`

## Commit conventions

Conventional commits from `frenchpath/` changes. Run `npm run check && npm run lint && npm run test:unit -- --run` before committing; run `npm run test:e2e` when routes, backup, or E2E helpers change.
