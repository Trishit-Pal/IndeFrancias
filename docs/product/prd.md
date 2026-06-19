# FrenchPath — Product Requirements Document (PRD)

> ⬆️ **The authoritative spec is now [`docs/spec/SPEC.md`](../spec/SPEC.md).** This PRD is a
> detailed product-requirements *appendix* to it. If the two disagree, SPEC.md wins.

> Single source of truth for what FrenchPath is, who it's for, and what it must do.
> Status: living document. Last revised 2026-06-16.

## 1. Vision

**FrenchPath helps Indian learners go from zero French to a DELF/DALF pass — entirely offline, with no account, on a phone they already own.**

French is the #2 most-studied foreign language in India (Alliance Française network, CBSE/ICSE second-language, immigration/PR to Canada & France, hospitality careers). Existing apps (Duolingo et al.) teach French *through English*, assume always-on connectivity, monetise attention, and harvest data. FrenchPath instead:

- **Bridges through the learner's own language** (Hindi/Hinglish + 9 more Indian languages) — every French word can be glossed inline in the native tongue.
- **Works 100% offline** — content, spaced repetition, and exam mocks all run on-device. Built for intermittent connectivity and data-cost sensitivity.
- **Owns nothing of the user** — no account, no server, no tracking. Progress lives only on the device; the user exports/imports a JSON backup they control.
- **Targets a real credential** — structured A1→C1 path culminating in DELF A2/B1/B2 and DALF C1 mock exams.

## 2. Target user & personas

Primary market: **India**. Language of instruction bridges: Hindi, Hinglish, English + Bengali, Tamil, Telugu, Kannada, Marathi, Gujarati, Punjabi.

| Persona | Goal | Why FrenchPath |
|---|---|---|
| **Aanya, 19 — college student** | French as a second language / study-abroad | Free, offline on a mid-range Android, Hindi bridges make grammar click |
| **Rohan, 27 — PR aspirant** | DELF B1/B2 for Canada Express Entry points | Exam-mode mocks scored like the real DELF; structured B-level path |
| **Meera, 34 — hospitality professional** | Conversational + workplace French | Travel/work goal tracks, TTS pronunciation, bite-sized daily ritual |
| **Privacy-conscious learner** | Learn without being tracked | No account, on-device-only, data-sovereignty as a first-class feature |

## 3. Differentiation (the moat)

1. **Native-language bridges** — `gloss` system renders Hindi/native glosses inline (`var(--fp-font-hindi)`); the mentor character "Mira" speaks Hindi.
2. **Offline-first, no-backend** — IndexedDB + bundled content + on-device FSRS. No login wall, no data cost to study.
3. **Data sovereignty** — see `docs/data-sovereignty.md`. Zero data collection → strongest possible Play Data Safety / Apple privacy posture and a genuine PR/ASO angle.
4. **Real exam alignment** — DELF/DALF mock structure (4 épreuves × /25, pass ≥50/100, ≥5/25 per section).
5. **Distinctive product world** — the "Le Grand Voyage" UI (Mumbai→Paris journey, characters Mira/Léo/Coco) is memorable and screenshot-worthy.

## 4. Feature spec & cross-platform parity matrix

The same codebase ships Web + Android + iOS (Capacitor). Parity is automatic for logic/UI; the matrix below tracks **platform-specific delivery** of cross-cutting capabilities.

| Capability | Implementation | Web | Android | iOS |
|---|---|---|---|---|
| Onboarding wizard | `OnboardingWizard.svelte` | ✅ | ✅ | ✅ |
| Voyage path / lessons | routes `+page`, `learn/[unitId]` | ✅ | ✅ | ✅ |
| Exercise engine (11 types) | `lesson/engine.ts`, `lesson/exercises/*` | ✅ | ✅ | ✅ |
| FSRS spaced repetition | `srs/` (`ts-fsrs`) | ✅ | ✅ | ✅ |
| A1–C1 content packs | `content/packs/*` | ✅ | ✅ | ✅ |
| DELF/DALF exam mode | `exam/*`, `routes/exam/*` | ✅ | ✅ | ✅ |
| 10 locales + gloss bridges | paraglide, `content/gloss` | ✅ | ✅ | ✅ |
| Gamification (streak/XP/skills/badges) | `gamification/*` | ✅ | ✅ | ✅ |
| TTS (French) | `audio/tts.ts` → Web Speech / **native plugin** | ✅ | ✅ (native) | ✅ (native) |
| Backup export/import | `pwa/backup.ts` → Blob / **Filesystem+Share** | ✅ | ✅ (native) | ✅ (native) |
| Revision reminders | Web Notification / **LocalNotifications** | ✅ | ✅ (native) | ✅ (native) |
| Offline operation | SW + bundled assets / native WebView bundle | ✅ | ✅ | ✅ |
| Persistence guarantee | `navigator.storage.persist()` | best-effort | strong | `ensurePersistence()` |

## 5. Success metrics

- **Activation:** % of installs that complete onboarding + first lesson (target ≥60%).
- **Retention:** D1/D7/D30; streak distribution (the core retention loop).
- **Learning outcome:** % reaching A2 checkpoint; DELF mock pass rate.
- **Store health:** rating ≥4.5, crash-free sessions ≥99.5%.
- *All measured on-device or via opt-in only — no silent analytics. (If analytics are ever added, they must be opt-in and privacy-preserving; default off.)*

## 6. Non-goals (YAGNI)

- ❌ User accounts / login. ❌ Cloud backend / server. ❌ Ads. ❌ Third-party trackers/SDKs.
- ❌ Social feed / leaderboards against strangers. ❌ Live tutoring.
- ❌ Languages other than French (taught) at launch.
- ⏸️ Optional E2EE cloud sync — *deferred*, its own future sub-project (architecture "prepared" per data-sovereignty doc).
- ⏸️ Monetisation — launch **free, privacy-first**; revisit a one-time "supporter unlock" later without compromising offline/no-account.

## 7. Constraints & principles

- **Offline-first, on-device-only** — no runtime network dependency for core flows.
- **Strict CSP** (`default-src 'self'`) — no CDN/runtime external requests (see [`frenchpath-csp-fonts` memory]).
- **Accessibility** — keyboard operable, `aria-live` feedback, reduce-motion honored, ≥44px tap targets.
- **Quality gates** — `svelte-check` 0/0, ESLint+Prettier clean, ≥80% unit coverage target, 188 unit + 35 e2e green on every change.
- **Content pipeline** — see `docs/content-curation.md`; validated, proofread JSON packs.

## 8. Related docs
- `docs/product/mobile-architecture.md` — how the mobile apps are built (Capacitor).
- `docs/product/gtm-launch.md` — launch, ASO, compliance, submission runbook.
- `docs/architecture-map.md` — engineering reference map + ADRs.
- `docs/data-sovereignty.md`, `docs/ml-roadmap.md`, `docs/content-curation.md`, `docs/launch-checklist.md`, `docs/testing.md`.
