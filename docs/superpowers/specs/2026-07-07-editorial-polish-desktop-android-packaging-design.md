# Editorial Polish + Desktop/Android Packaging (M2.5) — Design

> Design doc for a frontend enhancement pass (editorial French chic, restrained motion) plus
> packaging FrenchPath as an offline Windows `.exe` (Tauri) and Android `.apk` (Capacitor,
> sideload).
> Status: **approved** (brainstorm, 2026-07-07). Next step: `writing-plans` → implementation.
> Author session: brainstorming interview, this repo. Additive to existing docs; supersedes
> nothing. Builds on [data-sovereignty.md](../../data-sovereignty.md) and
> [launch-checklist.md](../../launch-checklist.md).

## 1. Context & problem

FrenchPath is a working, near-launch offline-first PWA (SvelteKit + `adapter-static`, IndexedDB
storage, Capacitor scaffold already present for Android/iOS). Recent sessions ("impeccable
polish" commits) have been improving individual screens ad hoc. Two things are missing before the
next milestone:

1. **A coherent visual direction.** The type system (Instrument Serif / Manrope / DM Mono) is in
   place but not pushed into a deliberate "editorial French" identity — polish so far has been
   per-screen, not system-wide.
2. **Native installable packages.** The product currently only runs as a browser PWA. The user
   wants a double-clickable Windows `.exe` and a sideloadable Android `.apk`, both fully offline,
   with zero change to the "no backend, ever" data promise.

This spec covers **both** because they share one constraint that shapes the design: the web build
stays the single source of truth rendered by three shells (web, Tauri, Capacitor), so visual and
platform work must be sequenced to avoid tripling the iteration cost of design changes.

## 2. Goals / non-goals

**Goals**
- One shared SvelteKit static build renders identically across web, Windows `.exe`, and Android
  `.apk`.
- Editorial French visual identity applied system-wide: type, color, motion tokens, applied
  consistently across home, lesson loop, progress, settings.
- One missing UX surface filled: a proper lesson-completion moment (currently absent).
- Windows installer via Tauri v2 (WebView2, no bundled Chromium, no Rust app logic beyond
  scaffold).
- Android release `.apk`, signed for direct sideload distribution (no Play Store this phase).
- Zero change to the data-sovereignty invariants in
  [data-sovereignty.md](../../data-sovereignty.md): no backend, no telemetry, on-device storage
  only, in all three shells.
- Security review gate before each phase's final commit.

**Non-goals (YAGNI)**
- ❌ Google Play Store listing / AAB / review process (explicitly deferred; sideload only this
  phase — see [launch-action-points memory]).
- ❌ Removing or replacing the Vercel web deployment (it stays; still on-device data per existing
  architecture).
- ❌ New product features or content (this is a polish + packaging pass, not a feature milestone).
- ❌ macOS/Linux desktop targets (Tauri could add these later near-free, but out of scope now).
- ❌ CI-based build pipeline for `.exe`/`.apk` (local builds only this phase).
- ❌ Auto-update mechanism for either package (no server to check against, by design).

## 3. Validated decisions (interview synthesis)

- **Distribution:** web (Vercel) stays as-is; add Tauri `.exe` and Capacitor `.apk` as two new,
  additional distribution channels. All three read/write the same on-device IndexedDB schema;
  none introduce a server.
- **Desktop tech:** **Tauri v2**, not Electron or Capacitor-Electron — smallest installer,
  uses Windows' built-in WebView2, no bundled Chromium, actively maintained.
- **Android distribution:** direct `.apk` sideload (not Play Store) — self-signed release
  keystore, generated and held by the user (human step, matches existing launch-checklist
  pattern of human-only blockers).
- **Design direction:** **Editorial French chic** — evolve the existing serif/sans/mono system
  into a confident magazine-like identity (large serif display type, italic serif for French
  phrases, mono reserved for stats-as-figures, warm paper / deep ink surfaces, hairline rules,
  generous whitespace). Not a "playful/game-like" departure, not a from-scratch rebrand.
- **Motion:** **restrained elegance** — smooth, quiet, physics-informed transitions (~200–300ms
  ease-out); one crafted lesson-completion flourish; existing celebration system
  (`src/lib/celebration/`) re-skinned to match, not rebuilt. Full `prefers-reduced-motion`
  compliance throughout (already partially present in `animations.css`; extend the pattern).
- **Scope:** enhance existing screens **and** fill small structural gaps the direction demands
  (lesson-complete screen, wide-window desktop layout, app icons/splash) — not a blank invitation
  for new features.
- **Focus areas, all four in scope:** visual identity, lesson/exercise loop, home/navigation/IA,
  platform-native feel (window chrome, splash, icons, safe areas, back-button, keyboard handling).

## 4. Approach

Sequence: **design-first on the shared web build, then package.** All three shells render the
same build, so improvements made once in the web layer ship to all three for free. Packaging
scaffolding (Tauri) is stood up early only far enough to smoke-test that WebView2 renders the
current app correctly — not to drive the design.

Rejected alternatives:
- *Package-first, polish inside the shells* — every design iteration would pay a triple-rebuild
  tax (web + Tauri + Capacitor) before the direction is even settled.
- *Fully parallel tracks* — platform-native design decisions (window chrome, safe areas) actually
  depend on packaging choices being made first, so the parallelism is partly illusory for one
  person driving both.

## 5. Architecture

### 5.1 Shared build, three shells

- **Web** — unchanged: `vite build` → `adapter-static` output → Vercel. No changes to hosting,
  routing, or headers (`vercel.json`, `static/_headers`) except where the security review in
  Phase 5 finds a shell-specific gap.
- **Windows `.exe` (new)** — `frenchpath/src-tauri/` (does not exist yet; created in Phase 1).
  Tauri v2 wraps the static `build/` output in WebView2. `tauri.conf.json` sets a locked-down,
  default-deny capability/allowlist config: no remote URL loading, no shell/file-system access
  beyond what the existing IndexedDB/backup flow needs (none — Tauri just serves static assets;
  IndexedDB is WebView2's own storage). Output: NSIS `.exe` installer.
- **Android `.apk`** — existing `capacitor.config.ts` + Capacitor Android platform (already a
  devDependency: `@capacitor/android`, `@capacitor/assets`, etc.). This phase completes what's
  scaffolded but unfinished: app icons/splash via `@capacitor/assets`, a release signing config
  reading keystore path/alias/passwords from environment variables (never committed), and
  `gradlew assembleRelease` documented as a build step.

### 5.2 Platform capability layer

`src/lib/platform/` already exists (`shell.ts`, `backup.ts`, `haptics.ts`, `notifications.ts`,
`tts.ts`) as the existing abstraction for platform differences (e.g., backup-via-download vs.
backup-via-Filesystem-plugin). This phase **extends** that module — does not replace it — to add:
- A `isDesktop` / `isTauri` capability flag alongside the existing Capacitor checks.
- Desktop-appropriate backup export (native save dialog instead of `<a download>`, if Tauri's
  dialog API is trivially available — else keep the existing download-blob path, which still
  works inside WebView2).
- Hiding web-only affordances (PWA "install" prompt) when already running inside a native shell.

### 5.3 Data layer

**Untouched.** IndexedDB behaves identically under WebView2 and Android WebView. No schema
change, no new store, no migration. This spec makes zero changes governed by
[offline-data-safety] invariants; the skill is invoked only as a gate-check, expected to find
nothing to flag.

## 6. Design language: Editorial French chic

Extends the existing token files (`src/lib/theme/tokens.css`, `characters.css`,
`animations.css`) rather than introducing a parallel system:

- **Type.** Instrument Serif pushed larger/tighter for display headings (route titles, unit
  names, the new completion moment); italic serif treatment for French phrases, presented like
  quotations; Manrope stays body text; DM Mono reserved for numeric "figures" (XP, streak count,
  scores) styled like magazine folios/captions, not general UI text.
- **Color.** Warm paper-toned light surfaces / deep ink dark surfaces, refined into the existing
  token set; one confident accent color (finalized in-browser during implementation, not
  prescribed here — candidates: deep bleu-de-France or oxblood). Existing dark mode preserved,
  not rearchitected.
- **Texture.** Hairline rules, small-caps section labels, generous margins — restrained,
  "printed page" feel. No new font files beyond what's already self-hosted via `@fontsource`; no
  CDN assets (preserves the existing strict `default-src 'self'` CSP).
- **Motion.** One shared vocabulary added to `src/lib/theme/animations.css`: ~200–300ms ease-out
  as the default transition; a single crafted lesson-completion flourish (ink-stamp / seal
  motif); `AchievementToast` and `XpFloat` re-skinned to the new palette/type, not
  re-architected. Every new animation respects the existing `prefers-reduced-motion` pattern.

## 7. Enhancement scope by area

- **Home / path (`/`)** — hierarchy pass: unit path as clear visual protagonist, editorial header
  treatment (day/streak/"today's ritual"), `PathNode` and `TierBadge` restyle, first-run/empty
  states.
- **Lesson loop (`/learn/[unitId]`, `/review`, `/checkpoint/[groupId]`, `/exam/*`)** —
  `ExerciseChrome` + `LessonShell` polish (progress indication, feedback states) applied
  consistently across exercise types; **new:** a lesson-complete screen (recap stats, serif
  flourish, next-step CTA) — the one genuinely new surface, filling a gap rather than adding a
  feature.
- **Progress (`/progress`) & Settings (`/settings`)** — typographic consistency pass; stats
  presented as editorial "figures" (mono treatment from §6).
- **Platform-native feel** — desktop: max-width editorial column instead of stretched mobile
  layout on wide windows, Tauri window title/icon; Android: splash screen + adaptive icon via
  `@capacitor/assets`, safe-area insets, back-button handling (Capacitor `App` plugin, already a
  dependency), keyboard-avoidance in exercise inputs.

Execution uses `/impeccable` and `/frontend-design:frontend-design` with live browser iteration,
route by route, one commit per surface — matching the existing "impeccable polish" commit
pattern (`2d5f655`, `a30c3bc`).

## 8. Packaging pipeline

- **Desktop:** new `npm run build:desktop` → `tauri build`, producing an NSIS `.exe` installer.
  Requires the Rust toolchain installed once locally (Tauri's build-time dependency; no Rust
  application code is written). `src-tauri/tauri.conf.json` and `Cargo.toml` committed;
  Tauri-generated build artifacts gitignored.
- **Android:** existing `npm run build:cap` (builds + `scripts/prepare-cap.mjs`) + `cap sync`,
  extended with a documented `gradlew assembleRelease` step reading signing config from
  environment variables. Keystore file itself is **never committed** — generated and held by the
  user, per the existing human-only-blockers pattern in
  [launch-action-points memory].
- Both build commands and manual smoke-test steps documented as new sections in
  [launch-checklist.md](../../launch-checklist.md), alongside the existing PWA checklist.

## 9. Security & privacy

`/security-review` runs at the end of Phase 4 (packaging) and again before final sign-off,
checking specifically:
- Tauri `tauri.conf.json` capabilities/allowlist are default-deny — no remote URL loading, no
  unnecessary shell/fs/http permissions.
- CSP (`default-src 'self'`) holds inside both native shells, not just the web build.
- No new network calls introduced anywhere (asset loading stays same-origin/bundled).
- Keystore path/alias/passwords are read from environment only, never hardcoded or committed.
- `data-sovereignty.md` invariants (on-device only, no telemetry) hold unchanged in all three
  shells.

## 10. Testing / verification

- Existing automated suites must stay green: `npm run check`, `npm run lint`,
  `npm run test:unit -- --run`, `npm run test:e2e`, `npm run spec:validate`.
- New manual matrix (added to `launch-checklist.md`):
  - Each polished route checked in-browser: light/dark, `prefers-reduced-motion` on/off, narrow
    and wide viewport.
  - `.exe`: install + launch smoke test on this Windows machine (human step).
  - `.apk`: sideload install + smoke test on an Android device (human step, matches existing
    launch-checklist pattern).
- `/spec-sync` updates `docs/spec/SPEC.md` as the Definition of Done for each phase.

## 11. Phases

1. **Tauri scaffold smoke test** — stand up `src-tauri/`, confirm the current build renders
   correctly in WebView2. No design work yet.
2. **Design-system tokens + motion vocabulary** — extend `theme/tokens.css`,
   `theme/animations.css` with the editorial palette/type/motion decisions from §6.
3. **Route-by-route polish** — home → lesson loop (incl. new lesson-complete screen) → progress
   / settings, per §7, using `/impeccable` + `/frontend-design:frontend-design`.
4. **Desktop/Android native polish + packaging finish** — window chrome, safe areas, icons,
   splash, signing config, per §7 (platform-native) and §8.
5. **Security review + spec sync** — `/security-review` per §9, then `/spec-sync`.

## 12. Open items resolved during implementation (not blocking this spec)

- Exact accent color (bleu-de-France vs. oxblood vs. other) — decided live in-browser during
  Phase 2, not prescribed here.
- Whether Tauri's native save-dialog API is used for backup export or the existing download-blob
  path is kept as-is inside Tauri (both satisfy data-sovereignty; a Phase 1 smoke-test decides
  based on what's trivially available).

## Related docs

- [Data sovereignty](../../data-sovereignty.md)
- [Launch checklist](../../launch-checklist.md)
- [Data safety hardening spec](./2026-06-08-data-safety-security-retention-hardening-design.md)
- [Living spec system](./2026-06-18-living-spec-system-design.md)
