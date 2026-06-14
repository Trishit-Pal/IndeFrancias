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
- E2E verifies no CSP violations on core routes

## Security headers

Portable across static hosts:

| File | Host |
|------|------|
| `vercel.json` | Vercel |
| `static/_headers` | Netlify / Cloudflare Pages |

Required headers:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy`: `microphone=(self)` (RecordCompare needs mic)
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security` (production HTTPS)

## Backup trust boundary

`importBackup()` receives **untrusted** user JSON:

1. `JSON.parse` → catch syntax errors
2. `backupFileSchema.safeParse` (Zod)
3. Recompute SHA-256 checksum via `checksum.ts`
4. Run payload migrations
5. Only then: transaction clear + put

Invalid input must **never** reach `clear()`.

## Content rendering

- `{@html}` only in trusted, escaped paths (e.g. `renderInlineMarkdown` for bridge content)
- Never render user input as HTML

## Secrets

- No API keys in repo
- `ANTHROPIC_API_KEY` only in local env for content generation scripts
- No runtime external calls except browser TTS (SpeechSynthesis)

## Verification

```bash
npm run test:unit -- --run src/lib/pwa/backup.spec.ts
npm run test:e2e -- --grep "CSP"
```

For header/backup changes, run **security-review** subagent before merge.
