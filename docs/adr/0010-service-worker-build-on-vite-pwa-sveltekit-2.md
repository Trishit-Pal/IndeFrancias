# ADR-10: Service-worker build on @vite-pwa/sveltekit 2

**Status:** Accepted
**Date:** 2026-11-25
**Deciders:** Product owner (option A chosen and signed off 2026-11-25)

## Context

FrenchPath is offline-first (ADR-1). The service worker that makes it work offline is generated at
build time by `@vite-pwa/sveltekit`, configured in `frenchpath/vite.config.ts`. The service worker
precaches the app shell and the SPA fallback `200.html`, serves deep links offline, and offers
updates through a prompt that never reloads the page on its own (invariant 6).

Dependabot proposed `@vite-pwa/sveltekit` 1.1.0 → 2.x (PR #25). Version 2 is not a drop-in bump:

- The `SvelteKitPWA()` plugin is replaced by a `withPwa()` wrapper that calls `sveltekit()` itself
  and wraps the adapter, so the service worker is generated after the adapter has run.
- Service-worker generation moves from `vite-plugin-pwa` to a new package family,
  `@unplugin-pwa/core` and `@unplugin-pwa/vite`. Those are at version 0.0.8.
- Three defaults changed in ways that matter here (see Consequences).

Forces:

- Version 2 is the line that supports SvelteKit 3. A high-severity advisory covers SvelteKit up to
  3.1.0, so a SvelteKit 3 migration is coming; staying on plugin version 1 would block it.
- The service worker is the part of the app a mistake hurts most: learners who installed the app
  keep whatever worker they have until a new one installs cleanly.
- The web open beta (M2) has not been announced widely yet, so few installs exist today.

## Decision

Move to `@vite-pwa/sveltekit` 2 now, keeping the generated service worker's behaviour the same as
version 1: same strategy (`generateSW`), same precache contents, same cache names, same update
prompt.

## Options Considered

### Option A: Migrate to version 2 now (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low: one config file and two type references |
| Cost | About a day including the upgrade test |
| Risk | Medium: new package family at 0.0.x under the offline shell |
| Fit with roadmap | Unblocks the SvelteKit 3 migration |

**Pros:** small diff; done while few installs exist; removes about 290 transitive packages
from the install; the generated worker was compared against version 1.
**Cons:** depends on 0.0.x packages; three changed defaults had to be found and pinned by hand.

### Option B: Stay on version 1 and close PR #25

| Dimension | Assessment |
|-----------|------------|
| Complexity | None today |
| Cost | Deferred, and larger later |
| Risk | Low today; blocks the SvelteKit 3 security upgrade |
| Fit with roadmap | Poor |

**Pros:** no change to the offline shell before the beta grows.
**Cons:** the same migration has to happen together with SvelteKit 3, with more installs in the
field and two moving parts at once.

### Option C: Version 2 through its legacy entry point (`LegacySvelteKitPWA`)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Similar to A |
| Risk | Same new engine as A, on a path documented for SvelteKit older than 2.63 |
| Fit with roadmap | Would need redoing for SvelteKit 3 |

**Pros:** keeps `sveltekit()` and `svelte.config.js` loading untouched.
**Cons:** the project is on SvelteKit 2.70, which is not the case that entry point is for; it moves
to the new engine anyway, so it carries option A's risk without its benefit.

### Option D: Hand-written service worker (SvelteKit's `src/service-worker`)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Cost | Days, plus owning precache and update logic for good |
| Risk | High: re-implements what workbox already does |
| Fit with roadmap | SvelteKit 3 removes the `$service-worker` module this relies on |

**Pros:** no plugin dependency.
**Cons:** most code, most risk, and built on an API that is going away.

## Trade-off Analysis

The real choice is A or B: take the new engine's immaturity now, or take a bigger combined
migration later. A wins because the risk can be measured today and cannot be avoided later. The
generated worker was checked against version 1 directly, and an upgrade from an installed
version 1 worker was exercised end to end (see Consequences). Doing this before the beta has many
installs keeps the blast radius small.

## Consequences

**Behaviour kept the same (checked against the version 1 build):**

- Content-Security-Policy in `200.html` and the web manifest are identical.
- Precache cache name is unchanged (`workbox-precache-v2-<scope>`), so `wipeLocalData.ts`, which
  keeps that cache during a reset, still works.
- The navigation fallback to `/200.html`, its denylist, the ignored URL parameters and both runtime
  caches (`frenchpath-audio`, `frenchpath-chunks`) are unchanged.
- The registration API the layout uses (`virtual:pwa-register`, `onNeedRefresh`, `onNeedReload`)
  is unchanged.

**Defaults that changed in version 2 and are now set explicitly in `vite.config.ts`:**

- An oversized precache file fails the build by default. `throwMaximumFileSizeToCacheInBytes: false`
  restores skip-with-warning, which is how the 5.8 MB speech-recognition chunk stays out.
- Old precache entries are no longer cleaned up by default. `cleanupOutdatedCaches: true` restores it.
- A missing `includeAssets` file is now an error. The stale `favicon.svg` entry is removed (the file
  never existed in `static/`; the favicon is imported from `src/lib/assets`).

**Other effects:**

- `withPwa` passes SvelteKit's options through the Vite config, so SvelteKit prints
  "svelte.config.js is ignored". `svelte.config.js` remains the single source: `vite.config.ts`
  imports it and passes it on, and svelte-check, eslint and `headers.spec.ts` still read it.
- Type references in `src/app.d.ts` point at `@unplugin-pwa/core`.

**Verified for this change:**

- Full local CI sequence, including the offline, deep-link, manifest and CSP e2e specs.
- A one-off upgrade probe: a browser with the version 1 worker installed was served the version 2
  build; the update prompt appeared, nothing reloaded on its own, Update switched to the new worker
  under the same cache name, old-only entries were removed, and a lesson deep link booted offline.

**The update prompt (decided with this ADR):**

- Deploying this build shows the update prompt to every learner who already installed the app.
  **Update** reloads the page, and a lesson, checkpoint, mock exam or review keeps its state in
  memory, so the prompt is now held while one of those screens is open and appears on the next
  screen (`isSessionRoute` in `src/lib/pwa/updatePrompt.ts`). The daily loop wins ties.
- While the prompt is visible the page reserves room for it, so the end of a page (Reset, About)
  can always be scrolled clear of it.

**To revisit:**

- `@unplugin-pwa/*` is at 0.0.x: read its changelog on every bump instead of trusting the range.

## Action Items

1. [x] Migrate `vite.config.ts` and `src/app.d.ts`; pin the three changed defaults.
2. [x] Compare the generated worker with version 1 and run the upgrade probe.
3. [ ] On a real deployment: install the PWA on a phone from the version 1 build, deploy this
       build, and confirm the update prompt, the reload and offline use.
4. [x] Add an automated e2e test for the update prompt (`e2e/update-prompt.e2e.ts`; the preview
       server serves a byte-different worker to one test context, so one build is enough).
5. [ ] SvelteKit 3 migration (separate decision).
