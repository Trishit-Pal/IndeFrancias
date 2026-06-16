# FrenchPath — Go-To-Market, ASO & Submission Runbook

> Launch strategy, store listings, compliance, and the step-by-step submission runbook.
> Status: draft → finalize asset capture in Phase 3. Last revised 2026-06-16.

## 1. Positioning

**One line:** *Learn French for the DELF — offline, private, and bridged through your own language.*

**Positioning statement:** For Indian learners who want real French (A1–C1, DELF/DALF), FrenchPath is the offline-first app that teaches through Hindi/your native language and never asks for an account or your data — unlike English-only, always-online, ad-driven apps.

**Pillars:** (1) Offline & data-light. (2) Hindi/native-language bridges. (3) No account, no tracking (data sovereignty). (4) Real exam prep (DELF/DALF mocks). (5) A delightful, distinctive "Grand Voyage" world.

## 2. ASO (App Store Optimization)

**Primary keywords:** learn french, french for hindi speakers, DELF, DALF, french offline, french A1 A2 B1, french exam, spaced repetition french, french vocabulary, french for beginners india.

**Title (≤30 chars):** `FrenchPath: Learn French`
**Subtitle / short desc (≤80 / ≤80):** `Offline French for the DELF — bridged through Hindi. No account, no tracking.`

**Keyword field (iOS, ≤100 chars, comma-sep, no spaces):**
`french,DELF,DALF,hindi,offline,spaced,repetition,vocabulary,A1,A2,B1,B2,exam,learn,language,india`

**Long description themes:** offline-first; Hindi/Hinglish + 9 Indian languages; FSRS spaced repetition; DELF/DALF mock exams scored like the real thing; no account/no ads/no tracking; the Mumbai→Paris journey.

**Localization:** list in `en-IN` + `hi-IN` first; consider `en-US`/`en-GB` for the diaspora.

## 3. Store listing copy (draft)

**Short:** *Master French A1→C1 and pass the DELF — completely offline, with Hindi bridges, and zero tracking.*

**Full (excerpt):**
> 🇫🇷 FrenchPath teaches French the way Indian learners actually study — offline, in short daily rituals, with every word bridgeable into Hindi or your own language.
> • A structured journey from Mumbai to Paris (A1→C1)
> • FSRS spaced repetition so you remember, not cram
> • DELF/DALF mock exams scored like the real exam
> • 10 Indian-language interface options + inline native-language glosses
> • 100% offline. No account. No ads. No tracking. Your data never leaves your phone.

## 4. Screenshot plan (6–8 per platform)

Capture the Grand Voyage screens via the **Playwright e2e harness** at store device frames (iPhone 6.7"/6.5"/5.5", Android phone + 7" tablet):
1. Le Voyage home (path + Mira + streak) 2. A lesson exercise with Léo feedback 3. Review (FSRS card + grade buttons) 4. DELF exam (formal navy + ADMIS stamp) 5. L'Atelier progress (heatmap + Coco) 6. Onboarding welcome 7. Settings "no account, no cloud" data card 8. Hindi UI.
Add captions emphasizing offline / Hindi bridges / no-tracking.

## 5. Compliance (trivial — no data collected)

| Item | Answer |
|---|---|
| Google Play **Data Safety** | No data collected, no data shared. No data types. |
| Apple **Privacy Nutrition Labels** | "Data Not Collected." |
| Apple **App Tracking Transparency** | Not required (no tracking). |
| Privacy Policy | Derive from `docs/data-sovereignty.md`; host a simple page (GitHub Pages/static). Required URL for both stores. |
| Content rating | Everyone / 3+ (educational). |
| Account deletion (Play policy) | N/A — no accounts; document that data is local + user-erasable in-app (Settings → reset). |

## 6. Phased launch

1. **Internal/dev builds** — Android emulator + iOS simulator smoke tests (Phase 4).
2. **Closed testing** — Play Internal Testing track + TestFlight (small cohort; gather crash/rating signal).
3. **Open beta** — Play Open Testing; TestFlight public link.
4. **Production** — staged rollout (Play 10%→50%→100%); App Store phased release. Lead market: India.
5. **Post-launch** — monitor ratings/crashes; in-app review prompt; iterate content.

## 7. Submission runbook (you drive the account steps)

**Prerequisites (you provide):** Google Play Console account ($25 one-time), Apple Developer Program ($99/yr), a privacy-policy URL, app icon source (1024×1024).

### Android (Google Play)
1. In Play Console: create app → category Education → free.
2. Generate upload keystore (`keytool`), store it securely; configure `android/` signing (or Play App Signing).
3. `cd frenchpath && npm run build && npx cap sync android` → open `android/` in Android Studio → Build → Generate Signed Bundle (`.aab`).
4. Complete: Data Safety (Section 5), content rating questionnaire, store listing (Sections 3–4), privacy URL.
5. Upload `.aab` to Internal Testing → promote → Production (staged rollout).

### iOS (App Store) — requires macOS + Xcode
1. In App Store Connect: create app → bundle id `app.frenchpath` → SKU.
2. `npx cap sync ios` → open `ios/App/App.xcworkspace` in Xcode → set Team/signing → Archive → Distribute → App Store Connect.
3. Complete: privacy labels ("Data Not Collected"), pricing (free), screenshots, description, privacy URL.
4. Submit for review → release (manual/phased).

### Pre-submit checklist
- [ ] Web gates green (`check`/`lint`/unit/e2e). [ ] App builds + runs offline on both. [ ] Icons/splash at all sizes. [ ] Privacy URL live. [ ] Listings + screenshots done. [ ] Version/build numbers set. [ ] Crash-free in smoke tests.

## 8. Risks & mitigations
- **iOS PWA-in-WebView review nuance** — Apple may scrutinize "web wrapper" apps; mitigate by shipping genuine native value (offline content, TTS, notifications, haptics, native file share) — all present.
- **No-account + data-erasure policy** — clearly state local-only + in-app reset.
- **Font/CSP regressions in WebView** — covered by the CSP discipline (see mobile-architecture R2).
