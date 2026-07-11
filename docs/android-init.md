# Android Init — Capacitor `cap add android`

> How to create the `frenchpath/android/` native project. Status: not yet run on any
> machine in this repo (`frenchpath/android/` does not exist). This is a one-time,
> human-run step — it needs Android Studio and cannot be scripted/automated in CI
> sandboxes without an Android SDK.

## Prerequisite

Install [Android Studio](https://developer.android.com/studio) first. It bundles the
Android SDK, platform tools (`adb`), and Gradle — none of which are present on a bare
Node/npm machine. Verify after install:

```
echo $ANDROID_HOME   # should point at the SDK (e.g. ~/Android/Sdk)
adb --version
```

If `ANDROID_HOME` is unset or `adb`/`gradle` are missing, the commands below will fail —
that's expected on a machine without Android Studio installed.

## Init sequence

Run from the `frenchpath/` package directory:

```
cd frenchpath
npm run build:cap       # vite build + copy build/200.html -> build/index.html (scripts/prepare-cap.mjs)
npx cap add android      # creates frenchpath/android/ (Gradle project) from capacitor.config.ts
npx cap sync             # copies build/ into android/, installs native plugin gradle deps
```

- `capacitor.config.ts` already has the correct config for this step — `appId: 'app.frenchpath'`,
  `appName: 'FrenchPath'`, `webDir: 'build'` — `cap add android` reads these directly, no manual
  edits needed.
- `npm run build:cap` exists in `frenchpath/package.json`
  (`"build:cap": "npm run model:fetch && npm run version:emit && npm run build && node scripts/prepare-cap.mjs && npm run verify:dist"`).
  It now fetches the ~42 MB pinned Vosk ASR model before building — this adds build time
  (a one-time download, then cached in `static/models/`, gitignored) and ~42 MB to the
  `build/` output, so `cap sync android` copies a correspondingly larger `android/app/src/main/assets/public/`
  and the resulting `.apk` is bigger than a model-free build.
- After `cap add android`, open the generated `android/` project in Android Studio to run/debug
  on a device or emulator (`npx cap open android` also launches it).

## Out of scope here

Icon/splash asset generation (`@capacitor/assets`), release signing (keystore), and the
`.aab`/APK build itself are **not** covered by this document — they belong to the follow-up
plan that extends this file once `android/` exists to generate against.

## Icons, splash, and building the APK

Once `cap add android` above has been run (requires Android Studio / the Android SDK):

```bash
npx capacitor-assets generate --android --splashBackgroundColor "#E5DACF"
npx cap sync android
```

This writes the icon/splash PNGs from `assets/icon.png` and `assets/splash.png` into
`android/app/src/main/res/`.

Debug build (unsigned, for local testing):

```bash
cd android && ./gradlew assembleDebug   # gradlew.bat on Windows
```

Expected: `android/app/build/outputs/apk/debug/app-debug.apk`. Install with
`adb install app-debug.apk` and confirm the app launches offline with the new icon
and splash background color visible.

Release build (signed) — see [launch-checklist.md](launch-checklist.md) for the keystore/
signing setup, then run `npm run build:apk`.

## Release signing

Once `android/app/build.gradle` exists (after `cap add android`), add env-var-driven signing
so the keystore and passwords are never committed:

Near the top of the file, before the `android {` block:

```gradle
def frenchpathKeystorePath = System.getenv("FRENCHPATH_KEYSTORE_PATH")
def frenchpathKeystorePassword = System.getenv("FRENCHPATH_KEYSTORE_PASSWORD")
def frenchpathKeyAlias = System.getenv("FRENCHPATH_KEY_ALIAS")
def frenchpathKeyPassword = System.getenv("FRENCHPATH_KEY_PASSWORD")
```

Inside the existing `android { ... }` block, alongside the generated `defaultConfig`/`buildTypes`:

```gradle
	signingConfigs {
		release {
			if (frenchpathKeystorePath) {
				storeFile file(frenchpathKeystorePath)
				storePassword frenchpathKeystorePassword
				keyAlias frenchpathKeyAlias
				keyPassword frenchpathKeyPassword
			}
		}
	}
```

Inside the existing `buildTypes { release { ... } }` block, add one line:

```gradle
			signingConfig signingConfigs.release
```

Verify afterward with `grep -n "storePassword\|keyPassword" android/app/build.gradle` — output must
show only the variable references above, never a quoted literal password.
