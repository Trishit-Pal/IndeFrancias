---
name: frenchpath-security
description: >-
  FrenchPath security — CSP, security headers, backup trust boundary, Permissions-Policy.
  Use when editing svelte.config.js kit.csp, vercel.json, static/_headers, backup import,
  or any untrusted JSON ingestion.
---

# FrenchPath Security

Offline-first PWA with no accounts. Security focus: XSS prevention, safe backup restore, header hardening.

## CSP

- Configured in `svelte.config.js` → `kit.csp` (hash mode)
- Strict `script-src 'self'` — no inline scripts except hashed
- E2E verifies no CSP violations on **six routes**: `/`, `/review`, `/progress`, `/settings`, `/learn/a1-unit-01`, `/exam/delf-a2`

## Security headers

Portable across static hosts:

| File | Host |
|------|------|
| `vercel.json` | Vercel |
| `static/_headers` | Netlify / Cloudflare Pages |

Required headers (asserted in `src/lib/security/headers.spec.ts`):

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy`: `microphone=(self)` (RecordCompare needs mic)
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security` (production HTTPS)

## Backup trust boundary

`importBackup()` receives **untrusted** user JSON:

1. `assertBackupSize` — reject files &gt; `MAX_BACKUP_BYTES` (5 MB)
2. `JSON.parse` → catch syntax / empty errors
3. Version check (`1` or `2`)
4. Recompute SHA-256 checksum (v2) via `checksum.ts`
5. `migrateBackup()` for legacy v1
6. `backupFileSchema.safeParse()` — **strict** Zod (unknown keys rejected)
7. Only then: transaction clear + put

`previewBackup()` runs steps 1–4 (+ counts) for the settings UI **without** mutating the DB.

Invalid input must **never** reach `clear()`.

## Settings import UX

- File size checked in UI before `file.text()`
- Preview modal: export date, lesson count, card count → user confirms
- `localStorage` key `frenchpath:lastExportAt` on export

## Content rendering

- `{@html}` only in trusted, escaped paths (e.g. `renderInlineMarkdown` for bridge content)
- Never render user input as HTML

## Secrets

- No API keys in repo
- `ANTHROPIC_API_KEY` only in local env for content generation scripts
- No runtime external calls except browser TTS (SpeechSynthesis)

## Verification

```bash
npm run test:unit -- --run src/lib/pwa/backup.spec.ts src/lib/security/headers.spec.ts
npm run test:e2e -- --grep "CSP|backup"
```

Full matrix: `docs/testing.md`. For header/backup changes, run **security-review** subagent before merge.
