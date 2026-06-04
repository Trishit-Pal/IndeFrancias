# Implementation Plan: "FrenchPath" — A CEFR A1→C1 French Learning PWA for Indian Learners

## TL;DR
- **Build an offline-first, install-free Progressive Web App** using SvelteKit + Vite + the `vite-plugin-pwa`/Workbox toolchain, storing all progress on-device in IndexedDB (via the `idb` library) with no account or server, and scheduling vocabulary/grammar review with the open-source FSRS algorithm (FSRS-6, shipped in Anki 25.07) rather than the legacy SM-2 (created by Piotr Woźniak in 1987).
- **Teach French *through* Hindi/English contrastive pedagogy** — leveraging the fact that Hindi has grammatical gender (a bridge English speakers lack), front-loading faux amis (e.g. *actuellement* = "currently," *librairie* = "bookshop"), and targeting documented Indian-learner error patterns — wrapped in culturally familiar content (Priya/Arjun, dal/biryani, Diwali/Holi/Eid, Indian cities).
- **Ship in three phases (MVP → V1 → V2)** mapping a full CEFR A1–C1 syllabus to official Council of Europe can-do descriptors and the DELF (A1–B2)/DALF (C1) exam structure, with evidence-based methods (spaced repetition, comprehensible input, shadowing, active recall) as the pedagogical spine. Note: in-browser speech *recognition* is unreliable cross-browser and must be treated as a progressive enhancement, not a core dependency.

---

## Key Findings

1. **No-account, on-device storage is fully achievable** with web standards. IndexedDB is the recommended primary store; web.dev states "Use IndexedDB to store structured data" (https://web.dev/learn/pwa/offline-data/) and Microsoft's PWA docs state verbatim that "IndexedDB is the best option for storing data in your PWA, because using the API doesn't slow down your app by blocking the main thread, and it can be used both from your app's front-end code and service worker" (https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline). Those same docs note that "IndexedDB, Cache API, or Origin Private File System Access API, can use up to 60% of the total disk space on the device" (e.g. ~38GB on a 64GB device), and MDN confirms Chromium browsers allow up to 60% of total disk in both persistent and best-effort modes. Persistence requires `navigator.storage.persist()`, otherwise data is "best-effort" and can be evicted under storage pressure.

2. **FSRS is the current state-of-the-art SRS** and is open-source (free to implement), unlike SuperMemo's proprietary latest algorithms. Anki adopted FSRS as the default in version 23.10 (November 2023) (https://studyglen.com/guides/best-spaced-repetition-apps); the latest revision, FSRS-6, has shipped in Anki since version 25.07 (2025), adding an optimizable forgetting-curve parameter (w20, range 0.1–0.8). Per the open-spaced-repetition benchmark across 9,999 Anki collections containing ~350 million filtered reviews, FSRS-6 has a lower log loss in 99.6% of collections (mean log loss 0.344), and students using FSRS need 20–30% fewer reviews to maintain the same retention rate (https://www.mindomax.com/fsrs-vs-sm2-spaced-repetition-algorithm). It also avoids SM-2's "ease hell." SM-2 remains a valid, simpler fallback.

3. **Web Speech API support is fragmented and Chromium-centric.** Per MDN (https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) and browser-compat data, `SpeechRecognition` works mainly in Chromium browsers (often streaming audio to a cloud service), Firefox keeps it disabled by default (per the testmuai support table, behind the `dom.webspeech.recognition.enable` flag), and Edge's implementation has been reported as effectively non-functional (https://github.com/mdn/browser-compat-data/issues/22126). `SpeechSynthesis` (TTS) is far more broadly supported. Architecture must degrade gracefully — notably, Duolingo only offers its voice exercises on Chrome (https://webspeechrecognition.com/what-is-web-speech-recognition).

4. **Contrastive pedagogy for Indian learners has a real linguistic basis.** Hindi has two grammatical genders (masculine/feminine) and gender agreement on adjectives/verbs — a cognitive scaffold English lacks — though Hindi gender assignment rules differ from French and cannot be transferred directly (per analyses such as https://blogs.transparent.com/hindi/grammatical-gender-non-living-things/ and the comparative study at https://saspublishers.com/article/3758/download/). Faux amis and the *être/avoir* + literal-translation errors are well-documented French-learning pitfalls (Alliance Française: https://af.ca/ottawa/en/three-most-common-mistakes-made-by-french-learners/).

5. **Gamification works but must be humane.** Duolingo's streak, leagues, and XP mechanics measurably drive retention — co-founder Luis von Ahn has stated gamification patterns improved next-day retention from 47% to 55%, with roughly 55% of users returning the next day to maintain a streak. The evidence-based design lesson is to layer intrinsic progress with social drivers and add "forgiveness" mechanics (streak freezes) so a missed day doesn't erase months of progress (https://blog.duolingo.com/how-duolingo-streak-builds-habit/).

---

## Details

### 1. Phased Roadmap

**Phase 0 — Foundations (pre-MVP).** Define content schema (JSON), build the lesson-rendering engine, set up SvelteKit + Vite + `vite-plugin-pwa`, establish the IndexedDB data layer with `idb`, and author the A1 content pack. Establish the design system and accessibility baseline.

**Phase 1 — MVP (A1–A2).**
- Core lesson player (vocabulary, grammar notes, multiple-choice/cloze/matching/reorder exercises).
- FSRS-backed SRS review queue.
- TTS-based listening and pronunciation modelling (SpeechSynthesis).
- On-device progress, streaks, settings — no account.
- Contrastive "Hindi/English bridge" notes and faux-amis decks for A1–A2.
- Offline-first; installable PWA.
- **Milestone:** a learner can complete the full A1→A2 path offline and pass a mock DELF A2.

**Phase 2 — V1 (B1–B2 + richer practice).**
- Reading passages with inline glossing and comprehension checks; graded listening with transcripts (shadowing mode).
- Writing exercises with rubric-based self/auto-checking (pattern + heuristic, optionally on-device LLM later).
- Optional speech-recognition pronunciation scoring as a Chromium-only progressive enhancement.
- Grammar drill generator; expanded gamification (leagues optional/local, achievements).
- **Milestone:** full A1→B2 syllabus; DELF B1/B2 mock exams.

**Phase 3 — V2 (C1 + advanced/personalisation).**
- C1 content: long demanding texts, implicit-meaning inference, register/style, nominalisation, advanced subjunctive/sequence-of-tenses.
- DALF C1 exam-prep module (synthèse, essai argumenté, exposé).
- Adaptive sequencing, optional encrypted export/import of progress (file-based, still no account), optional on-device ASR/LLM via WebGPU/WASM.
- **Milestone:** full A1→C1; DALF C1 mock.

### 2. Tech Stack Recommendations

- **Frontend framework (recommended): SvelteKit (Svelte 5).** Rationale: compiler-based, no virtual DOM, smallest practical bundles and lowest runtime overhead — ideal for a mobile-first PWA serving Indian users on mid-range Android devices and variable networks (https://www.frontendtools.tech/blog/best-frontend-frameworks-2025-comparison). Trade-off: smaller ecosystem than React. **Alternatives:** Vue 4 + Vite (excellent PWA story via Vite PWA / Nuxt, larger ecosystem, strong DX — judged ideal for low-powered mobile PWAs by https://tech-insider.org/react-vs-vue-2026/); React 19 + Vite (largest ecosystem and talent pool, but larger bundles). Avoid Next.js here — its SSR/RSC model adds server complexity unneeded for a static, offline-first, no-account app.
- **Build tooling: Vite.** Pair with `vite-plugin-pwa` (Workbox under the hood; https://vite-pwa-org.netlify.app/). Use the `injectManifest` strategy for a custom service worker (full control over runtime caching of audio/content), or `generateSW` for standard precaching. Always include js/css/html in `globPatterns` or precache will fail.
- **State management:** Svelte stores (built-in; no external library needed). For React/Vue alternatives, Zustand/Pinia respectively.
- **Offline storage:** IndexedDB via the `idb` library (Jake Archibald's promise wrapper, recommended by web.dev). Use `idb-keyval` for simple key/value settings. Cache API (via Workbox) for app shell + media assets. OPFS only for large binary audio blobs if needed (note: not supported in Firefox, per https://patrickbrosset.com/articles/2023-01-17-web-storage/).
- **Audio/Speech:** SpeechSynthesis API for French TTS (broad support); pre-recorded native-speaker audio (authored, cached via Workbox) as the higher-quality primary for listening/shadowing. SpeechRecognition only as Chromium-only enhancement with explicit feature detection (`'webkitSpeechRecognition' in window`), automatic `onend` restart handling, and a non-blocking fallback.
- **Animation:** Svelte's built-in transitions/motion; add GSAP for complex timelines if needed. (Framer Motion is React-specific.)
- **Styling/Design system:** Tailwind CSS + a headless component layer (e.g. Melt UI / Bits UI for Svelte) for accessible primitives.
- **Hosting/PWA:** Static deploy to a CDN-backed host (Netlify/Vercel/Cloudflare Pages — static output, no server functions required). Web App Manifest + service worker for installability and offline.

### 3. Feature Specs

- **Lessons:** Bite-sized units (~5–10 min). Each unit: learning objective mapped to a CEFR can-do, new vocabulary (with gender tagging), a contrastive grammar note, worked examples in Indian contexts, then graded exercises. First "I did it" win within minutes; defer any optional personalization prompt until after success (Duolingo onboarding pattern).
- **Exercise types:** multiple choice, cloze/fill-gap, word-bank sentence reordering, matching, dictation (listen→type), translation (both directions), gender-tagging drills, conjugation tables, and speaking/shadowing prompts.
- **SRS:** FSRS-6 scheduler with a configurable desired-retention target (default 90%). Each vocab item/grammar pattern is a card with FSRS state (difficulty, stability, retrievability inputs, last review, due date). Four-button grading (Again/Hard/Good/Easy — FSRS uses one fail choice plus three positive grades). SM-2 retained as a fallback toggle.
- **Speaking/pronunciation:** (1) TTS model + record-and-compare (waveform playback) on all browsers; (2) shadowing mode (audio + scrolling transcript, repeat in real time) — backed by a 2025 systematic review of 44 studies finding shadowing improves comprehensibility, intelligibility, fluency and prosody, though evidence for segmental accuracy is inconclusive (https://www.tandfonline.com/doi/full/10.1080/29984475.2025.2546827); (3) optional ASR scoring on Chromium with confidence scores (0–1 per `SpeechRecognitionAlternative`), clearly labelled as approximate.
- **Listening:** native-audio clips with adjustable speed, transcripts toggle, comprehension questions; targeted nasal-vowel and liaison drills.
- **Reading:** leveled passages with tap-to-gloss, comprehension checks, and faux-amis flagged inline.
- **Writing:** prompts with model answers, checklists/rubrics, and pattern-based feedback (e.g. detect *je suis 20 ans* → suggest *j'ai 20 ans*; *Je suis faim* → *J'ai faim*).
- **Grammar drills:** auto-generated from templates with Indian-context lexis.
- **Gamification:** XP, daily goal, streak with streak-freeze forgiveness, achievements/badges, optional local leagues. Layer intrinsic progress (path completion) with optional, opt-out social drivers.
- **Progress tracking:** per-skill (listening/reading/spoken interaction/spoken production/writing) CEFR progress bars, mastery heatmap, review forecast.

### 4. Content Strategy

- **Authoring format:** version-controlled JSON (or MDX for rich lesson prose) per unit, validated against a schema; content packs lazy-loaded and cached per level. Separation of content from code allows non-engineer authoring.
- **Sequencing:** CEFR-mapped spine (below), spiralled — earlier items recycle into later units via SRS. Comprehensible-input principle: keep ~90%+ of each text known so new items are inferable; SLA sources cite input should be ~95–98% comprehensible for optimal acquisition (https://gianfrancoconti.com/2025/02/27/why-the-input-we-give-our-learners-must-be-95-98-comprehensible-in-order-to-enhance-language-acquisition-the-theory-and-the-research-evidence/).
- **Contrastive pedagogy woven in:** every grammar point includes a "Bridge from Hindi/English" box. Examples: use Hindi's existing gender system (e.g. *kitaab/किताब* feminine; *roti/रोटी* feminine) as a familiar analogy for *la* vs *le* while explicitly warning that French gender ≠ Hindi gender; front-load faux amis; pre-empt *être/avoir* literal-translation errors; dedicated nasal-vowel, French-R, and silent-ending pronunciation tracks (silent final consonants, silent *-ent* third-person plural).
- **Cultural localization:** Indian names, food, festivals, and cities populate all example sentences/dialogues (e.g. *"Priya achète du pain pour le petit-déjeuner à Bangalore."*; *"Pendant Diwali, Arjun rend visite à sa famille à Jaipur."*), with periodic France/Francophone-culture modules so learners also acquire target-culture competence.
- **Data format for cards:** each vocab/grammar card carries French form, gender, IPA, audio ref, Hindi gloss, English gloss, Indian-context example, faux-ami flag, CEFR level, and skill tags.

### 5. Data Model for On-Device Progress (IndexedDB via `idb`)

Single versioned IndexedDB database (e.g. `frenchpath`), object stores:

- **`settings`** (key/value): uiLanguage (Hindi/English/Hinglish), targetRetention, dailyGoal, ttsVoice, audioSpeed, theme, reduceMotion, persistGranted.
- **`progress`** (keyPath `lessonId`): status (locked/available/completed), score, attempts, lastVisited, cefrLevel.
- **`srsCards`** (keyPath `cardId`; indexes on `due`, `cefrLevel`, `skill`): FSRS state — difficulty, stability, reps, lapses, lastReview, due, lastGrade, schedulerVersion.
- **`reviewLog`** (autoIncrement; index on `cardId`, `ts`): each review's grade + elapsed time (needed for FSRS optimization, which relies on review history).
- **`streak`** (singleton): currentStreak, longestStreak, lastActiveDate, freezesAvailable, freezesUsed.
- **`stats`** (keyed by date): xp, minutes, lessonsCompleted, reviewsDone — for charts/forecast.
- **`skillProfile`** (keyed by skill): estimated CEFR level per listening/reading/spoken-interaction/spoken-production/writing.
- **`mediaCache`**: handled by Cache API/Workbox (not IndexedDB) for audio/images.

All writes wrapped in `idb` transactions (await `tx.done` to confirm commit). Call `navigator.storage.persist()` on first meaningful write to request persistent storage. Provide a manual JSON export/import (file download/upload) so users can back up/transfer progress without any account.

### 6. Full CEFR-Mapped Syllabus (A1 → C1)

The Council of Europe organises proficiency into six levels (A1–C2) grouped as Basic User (A1–A2), Independent User (B1–B2), Proficient User (C1–C2), defined by "can-do" descriptors (https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions); the 2020 Companion Volume updated/extended these and added mediation and online-interaction descriptors (https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2018/1680787989). The verbatim official Global Scale and Self-Assessment Grid (five-skill) descriptors should be linked/licensed from the official tables (Table 1 Global Scale: https://www.coe.int/en/web/common-european-framework-reference-languages/table-1-cefr-3.3-common-reference-levels-global-scale; Table 2 Self-Assessment Grid: https://www.coe.int/en/web/common-european-framework-reference-languages/table-2-cefr-3.3-common-reference-levels-self-assessment-grid). Skills below follow the five CEFR activities: Listening, Reading, Spoken Interaction, Spoken Production, Writing. Exam alignment: DELF certifies A1–B2; DALF certifies C1–C2 (https://gogofrance.com/en/blog/french-test-delf-dalf-tcf-guide/); each DELF/DALF level tests all four skills at 25 points each (100 total), with a passing score of 50/100 and a *note éliminatoire* — a minimum of 5/25 required in each skill (e.g. a B2 candidate scoring 64/100 still fails with 4/25 in speaking).

**A1 (Basic User — Breakthrough).** Global descriptor (per official Global Scale): can understand and use familiar everyday expressions and very basic phrases, introduce self/others, and interact simply if the other person speaks slowly and clearly.
- *Listening:* understand slow, clear everyday words/numbers. *Reading:* signs, posters, simple forms. *Spoken interaction:* basic greetings, personal questions. *Spoken production:* describe where one lives, family. *Writing:* fill forms, short message/postcard.
- *Grammar:* present indicative of regular -er verbs + key irregulars (*être, avoir, aller, faire*), definite/indefinite articles, gender & number agreement, basic negation (*ne…pas*), question forms, possessives, numbers, *futur proche*.
- *Vocab/function:* greetings, self-introduction, family, food, days/time. *Bridge:* gender exists in Hindi too; faux amis intro.

**A2 (Basic User — Waystage).** Descriptor: can understand sentences and frequently used expressions relating to areas of immediate relevance; communicate in simple, routine tasks.
- *Skills:* understand short clear announcements; read short routine texts; handle short social exchanges; describe background/daily routine; write simple connected notes/letters.
- *Grammar:* *passé composé* (avoir/être + agreement), *imparfait* introduction, reflexive verbs, COD/COI pronouns, comparative, near future vs simple future intro.
- *Function:* shopping, directions, past events, making plans. ~800–1,000 word vocabulary.

**B1 (Independent User — Threshold).** Descriptor: can understand the main points of clear standard input on familiar matters; deal with most travel situations; produce simple connected text; describe experiences, hopes, opinions.
- *Skills:* main points of clear speech/radio; understand everyday/job-related texts; sustain unprepared conversation; connect phrases to narrate; write structured paragraphs and a formal letter.
- *Grammar:* full past-tense contrast (passé composé vs imparfait), *futur simple*, *conditionnel présent*, relative pronouns (*qui/que/où/dont*), *subjonctif présent* (intro in fixed expressions), indirect/reported speech, *y/en*.
- *Function:* opinions, experiences, hypotheses, complaints.

**B2 (Independent User — Vantage).** Descriptor: can understand main ideas of complex text on concrete and abstract topics; interact with fluency and spontaneity with native speakers; produce clear, detailed text and argue a viewpoint.
- *Skills:* follow extended speech/most TV; read articles and contemporary prose; argue and defend views fluently; give clear detailed descriptions; write essays/reports developing arguments.
- *Grammar:* full subjunctive use, *plus-que-parfait*, *conditionnel passé*, passive voice, *si*-clauses (all three types), complex relative pronouns (*lequel*, etc.), *passé simple* (recognition), gerund/participle.
- *Function:* structured argumentation, register awareness, nuance.

**C1 (Proficient User — Effective Operational Proficiency).** Descriptor: can understand a wide range of demanding, longer texts and recognise implicit meaning; express ideas fluently and spontaneously; use language flexibly for social/academic/professional purposes; produce clear, well-structured, detailed text on complex subjects, controlling organisational patterns and cohesive devices.
- *Skills:* understand extended speech even when not clearly structured; understand long complex/literary texts and grasp implicit meaning; contribute to debates with idiomatic ease; deliver structured exposés; write well-organised essays/synthèses with appropriate register.
- *Grammar/style:* confident control of all tenses/moods including *subjonctif passé* and sequence of tenses, third conditional (*si + plus-que-parfait + conditionnel passé*), nominalisation, inversion for emphasis, impersonal structures, advanced connectors.
- *Function:* synthesis of multiple sources, abstract/academic discourse, stylistic register shifting. *Exam:* DALF C1 (synthèse de documents, essai argumenté, compréhension orale/écrite, exposé).

### 7. UX/UI Principles

- **Mobile-first, thumb-reachable** layouts; large tap targets; works on mid-range Android.
- **Time-to-value:** first success within minutes; no sign-up wall (and architecturally there is no account at all).
- **Micro-feedback:** sound + animation on correct/complete to reward and mask processing waits; respect `prefers-reduced-motion`.
- **Humane gamification:** streaks with freezes; opt-out of competitive features.
- **Accessibility:** WCAG-aligned color contrast, keyboard navigation, ARIA via headless components, captions/transcripts for all audio, screen-reader-labelled controls, scalable text. Bilingual UI (Hindi/English/Hinglish toggle).
- **Offline transparency:** clear indicators that content is available offline and that progress is saved locally; surface storage-persistence status and export/backup option.

---

## Recommendations

1. **Start now with the SvelteKit + Vite + `vite-plugin-pwa` + `idb` + FSRS-6 stack.** This combination directly satisfies the no-account/on-device constraint and the mobile-first performance priority. If the team's existing skills are React-heavy, substitute React 19 + Vite + Zustand without changing the architecture.
2. **Treat speech recognition as optional.** Build listening/pronunciation on TTS + native audio + shadowing + record-and-compare first; add Chromium-only ASR scoring in Phase 2 with explicit feature detection and a non-blocking fallback. Re-evaluate if/when the on-device Web Speech recognition (`SpeechRecognition.available()`/`install()`) matures cross-browser.
3. **Author content contrastively from day one.** Bake the Hindi/English bridge boxes, faux-amis decks, and Indian-context examples into the schema, not as an afterthought.
4. **Adopt FSRS-6 with a 90% retention default; expose SM-2 fallback.** Log every review (grade + elapsed time) so FSRS parameters can later be optimized on-device once the user accumulates enough reviews (FSRS needs roughly 1,000+ reviews before per-user optimization meaningfully beats defaults).
5. **Ship A1–A2 as MVP, validate with mock DELF A2,** then extend. Benchmarks/thresholds that would change the plan: if target devices show IndexedDB quota eviction in testing, prioritize `navigator.storage.persist()` and add export/backup prompts; if Chromium ASR accuracy on Indian-accented French tests poorly, drop ASR scoring entirely and lean on shadowing.

---

## Caveats

- **Browser API support is the biggest technical risk.** Web Speech `SpeechRecognition` is not reliably cross-browser (Chromium-only in practice; Edge's implementation reported as broken; Firefox disabled by default); quotas for on-device storage are "best-effort" unless persistence is granted; OPFS is unsupported in Firefox. These are documented limitations, not speculation.
- **Hindi-as-bridge has limits.** Hindi gender exists (a genuine cognitive scaffold) but its assignment rules differ from French, so it is useful as an *analogy/awareness* tool, not a predictive rule — this must be stated to learners.
- **CEFR descriptors are copyrighted Council of Europe text.** The syllabus above paraphrases and maps to them; the exact verbatim can-do statements should be linked to / licensed from the official coe.int sources rather than reproduced wholesale.
- **SLA evidence is contested.** Krashen's comprehensible-input hypothesis is influential but criticized as vague/untestable (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12577063/); the plan therefore combines input with output, active recall, and spaced repetition rather than betting on any single theory. Shadowing evidence is positive for prosody/fluency/comprehensibility but inconclusive for segmental accuracy.
- **App-efficacy and gamification figures come largely from vendor/industry sources** (e.g. Duolingo's own retention figures) and should be treated as directional, not definitive. Independent efficacy research (e.g. the Busuu/Babbel/Duolingo comparison at https://dl.acm.org/doi/10.1145/3606150.3606152) shows app exposure correlates more strongly with written than oral proficiency gains.