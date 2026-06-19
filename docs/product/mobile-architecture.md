# FrenchPath — Mobile Architecture (Capacitor)

> How the Android + iOS apps are built. Status: design + implementation guide. Last revised 2026-06-16.

## 1. Strategy: one codebase, three platforms

FrenchPath's mobile apps are the **existing SvelteKit PWA wrapped with [Capacitor](https://capacitorjs.com/)**. Capacitor packages the static web build into a native app that runs in a system WebView (Android System WebView / iOS WKWebView) and exposes native device APIs via a JS bridge. We re-use the entire app — logic, content, FSRS, i18n, exam mode, the Grand Voyage UI — with no duplication.

```
frenchpath/ (SvelteKit, adapter-static)
        │  npm run build  →  build/  (static SPA, self-contained, offline)
        ▼
   capacitor.config.ts (webDir: 'build')
        │  npx cap sync
        ├──────────────► android/  (Gradle project)  → .aab → Google Play
        └──────────────► ios/      (Xcode project)    → .ipa → App Store
```

**Why this fits:** the app is already 100% offline (bundled assets, self-hosted fonts, local IndexedDB, no backend) and CSP-hardened — i.e. already "native-shaped." Capacitor adds only the shell + native APIs.

## 2. Build pipeline

1. `cd frenchpath && npm run build` → emits `build/` (adapter-static SPA).
2. `npx cap sync` → copies `build/` into `android/` and `ios/`, installs native plugin pods/gradle deps.
3. Android: `npx cap run android` (dev) / Gradle `bundleRelease` → `.aab`.
4. iOS (**macOS + Xcode required**): `npx cap run ios` (dev) / Xcode Archive → `.ipa`.

CI (future): GitHub Actions can build the web + `cap sync` + Gradle for Android; iOS archives require a macOS runner.

## 3. The 4 integration risks (and resolutions)

### R1 — SPA entry: `index.html` vs `200.html`
`@sveltejs/adapter-static` is configured with `fallback: '200.html'` (SPA shell) and `paths.relative: false` (absolute asset paths). Capacitor's WebView loads `index.html` from the bundle by default.
**Resolution:** set the adapter `fallback: 'index.html'` (or add a build step copying `200.html`→`index.html`). Absolute `/_app/...` paths resolve against the app origin (`capacitor://localhost` on iOS, `https://localhost` on Android) — same-origin, so they load. Client routing (`/learn/[unitId]`, `/exam/*`) is handled by the SvelteKit client router; deep links are not server-resolved.

### R2 — CSP under the Capacitor scheme + bridge
The strict CSP lives in `svelte.config.js` (`default-src 'self'`, `script-src 'self'`, `connect-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`). Capacitor's bridge and the WebView origin must be permitted while staying strict.
**Resolution:** keep `default-src 'self'`; `'self'` already maps to the Capacitor origin so self-hosted fonts/assets/IndexedDB work. Add only what the bridge needs — typically `connect-src` allowance for the Capacitor scheme and (iOS) the `gap:`/`capacitor:` scheme. Verify with the existing **"no CSP violations" e2e** mindset on-device (watch the WebView console). Do **not** relax to allow external origins — see the `frenchpath-csp-fonts` memory.

### R3 — Service worker inside the WebView
`vite-pwa` registers a Workbox SW with `navigateFallback: '/'`. Inside Capacitor the assets are already local, and the SW's navigate-fallback can conflict with local serving / cause stale caching across app updates.
**Resolution:** detect native (`Capacitor.isNativePlatform()`) and **skip SW registration** in the shell (the WebView bundle is the cache). Keep the SW for the web build. Implemented at the registration site in `+layout.svelte` via the `src/lib/platform` seam.

### R4 — iOS WKWebView IndexedDB eviction
WKWebView may evict IndexedDB under storage pressure.
**Resolution:** call the existing `ensurePersistence()` (`src/lib/pwa/persist.ts`) on launch (already invoked after onboarding); on iOS, Capacitor's WebView storage is app-private and durable in practice, but we keep the persistence request + the JSON backup/export as the durable safety net. Document "Export regularly" (already surfaced in Settings).

## 4. Platform abstraction seam — `src/lib/platform/`

A single module isolates all native-vs-web branching so **web behavior is unchanged** and native is an enhancement:

```ts
// src/lib/platform/index.ts (new)
export const isNative = () => Capacitor?.isNativePlatform?.() ?? false;
// capability-routed helpers re-exported to feature modules
```

Feature modules call the seam; they never import Capacitor directly:

| Feature | Web path (unchanged) | Native path (plugin) | Wrapped in |
|---|---|---|---|
| TTS | `speechSynthesis` | `@capacitor-community/text-to-speech` (fr-FR) | `audio/tts.ts` |
| Backup export | `Blob` download | `@capacitor/filesystem` write + `@capacitor/share` | settings `download()` |
| Backup import | `<input type=file>` | `@capacitor/filesystem` / picker | settings `onFile()` |
| Reminders | `Notification` | `@capacitor/local-notifications` | `pwa/revisionNotify.ts` + `+layout` |
| Haptics | `navigator.vibrate` | `@capacitor/haptics` | review grade path |
| SW registration | register | **skip** | `+layout.svelte` |

## 5. Native shell UX

- **Status bar** (`@capacitor/status-bar`) — themed to the page (navy in exam mode via the `.fp-exam-mode` signal).
- **Splash screen** (`@capacitor/splash-screen`) — Grand Voyage cream + logo; hidden on app ready.
- **Safe areas** — already handled via `env(safe-area-inset-*)` in the layout; verify notch/home-indicator.
- **Android hardware back** (`@capacitor/app` `backButton`) — maps to SvelteKit history back; exits at the root.
- **In-app review** (`@capacitor-community/in-app-review`) — prompt after a milestone (e.g. first checkpoint pass), rate-limited.

## 6. Security & privacy posture (mobile)

- No backend, no accounts, no analytics SDKs, no ad SDKs → Play **Data Safety = "no data collected/shared"**, Apple privacy labels = none, **ATT not required**.
- Strict CSP carried into the WebView; bridge surface minimized to the plugins above.
- All user data on-device (app-private storage); export is user-initiated.
- Dependencies pinned; native plugins vetted (official `@capacitor/*` + reputable `@capacitor-community/*`).

## 7. Plugin inventory

Core: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/assets` (dev).
Runtime: `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/haptics`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/local-notifications`, `@capacitor-community/text-to-speech`, `@capacitor-community/in-app-review`.

## 8. Open config to confirm
- `appId` (proposed `app.frenchpath`), `appName` ("FrenchPath"), version/build numbering.
- Min/target SDK (Android), min iOS version.
- Signing: Android keystore, Apple distribution cert/profile (user-provided at submission).
