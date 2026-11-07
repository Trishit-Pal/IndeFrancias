# Design + plan: "Today" coach and contextual review (FrenchPath)

## Context
Interview outcome (2026-11-06):
- **Weakest moment:** the user named Review and Progress.
- **Core pain:** these are two disconnected screens. Progress names a weak skill that Review ignores, and Review is passive flip-and-self-grade.

**Decisions the user made:**
1. Progress answers **"What do I do today?"** first. Stats become supporting context. This matches the SPEC §2 decision rule (daily loop first).
2. Review feels like **using French in context**: the word is blanked inside its example sentence.
3. The answer mode is **tap one of 4 choices**, chosen for low-end phones and commutes.
4. **"Today's focus" changes how cards are presented, not which cards come up.** All due cards are reviewed through the weak skill's mode. This was decided after the builder check found that 309 of 356 cards are tagged `reading`, with only 7 `listening` and 5 `writing`, so a skill can't be used to select cards.
5. Add-ons: **Leech rescue**, **Recall upgrade** (mature cards become typed or spoken), and **Weekly postcard**.
6. Parked: the exam-readiness ETA line.

**Why it's feasible now:**
- All 356 cards have `example.french` with per-language glosses.
- Every `SrsCard` carries `skill`, `lapses` and `stability`.
- The skill profile marks a weakest skill.
- `reviewLog` has a `ts` index.
- **No IndexedDB schema change, no migration, and no new dependency are needed.**

## Goals and anti-goals
- **Goal:** one honest daily recommendation, reached in one tap, followed by a review session that trains the weak skill through retrieval in context.
- **Anti-goals (SPEC invariants 1, 2, 6):**
  - No network, no runtime AI, no notifications.
  - No guilt or urgency copy.
  - No dark patterns.
  - Nothing leaves the device.
  - The app never prompts for downloads or permissions on its own.

---

## Part A: "Today" coach (top of `/progress`)
- **New pure module `src/lib/gamification/todayPlan.ts`** (no IO, unit-tested):
  - `weakestSkill(profiles): Skill | null`: lowest CEFR level, with ties broken in a fixed skill order. It replaces the inline `$derived` (`progress/+page.svelte:75-81`) and the duplicate in `adaptiveSuggestions.ts:13`.
  - `buildTodayPlan({dueCount, leechDue, focusSkill, focusAvailable, goal, hasLessonsLeft}): TodayPlan` returns:
    - `kind`: `'review' | 'lesson' | 'rest'`
    - `mode`: the presentation mode
    - `cardCount`: `min(due, DEFAULT_REVIEW_BATCH 20)`
    - `minutes`: ≈ cards × `SECONDS_PER_CARD` (25 s)
    - a copy key.
  - `goal` comes from `dailyGoalProgress` (`gamification/activity.ts:21`).
  - **Rules, in order:**
    1. Cards are due: recommend a review in the focus skill's mode.
    2. Nothing due and the goal is not met: recommend the next lesson.
    3. Otherwise: `rest` ("You're done for today").
  - **Focus to mode (`focusMode(skill, caps)`):**

    | Weakest skill | Mode | Fallback |
    |---|---|---|
    | `listening` | `listen` | `read` if TTS has no French voice (`caps.tts`) |
    | `reading` | `read` | — |
    | `writing` | `type` | — |
    | `spokenProduction` / `spokenInteraction` | `speak` | `type` if the Vosk model isn't downloaded (`caps.asr` via `modelSource.getModelStatus`) |

    When it falls back, the coach shows one calm hint, such as "Download the speaking pack from any speaking exercise in a lesson" (Settings has no download or voice install, so the hint is plain text with no link). It never auto-prompts.
- **UI:**
  - A new `TodayCard.svelte` (`InfoBanner`, `IconButton`, tokens) at the top of `/progress`.
  - Its button links to `/review?mode=<mode>`, or to the next lesson.
  - Every existing widget and `data-testid` stays below it.
  - New test ids: `today-card`, `today-start`.

## Part B: Contextual review with presentation modes (`/review`)
- **New pure module `src/lib/srs/contextCard.ts`:**
  - **Blanking:** `buildContextPrompt(card, candidates)` returns `{before, answer, after, choices[4]} | null`. It splits `example.french` with `tokenizeFrench`, then matches each token with `normalizeFrenchToken`/`stripContraction` (`content/lexicon.ts`) against `card.french` and `card.forms`. The first match becomes the blank, and its surface form is the answer.
  - **Distractors:** three, from the same unit first (the learner has met these words, because cards exist only for completed units), then the same CEFR level.
    - They must share `gender`, except when it is `none`.
    - They exclude the target, any word already in the sentence, and any duplicate of the answer.
    - The shuffle is seeded by `cardId`.
    - Comment: `// ponytail: no part-of-speech field; unit+gender is the proxy — add a pos tag in content if distractors read as obviously wrong.`
  - **Fallback:** `null` (no match, or fewer than 3 distractors) means the card renders as today's flip card, unchanged.
- **Modes**, read from `?mode=` and validated against the union. Missing or invalid means `read`.

  | Mode | Presentation | Answer | Grader |
  |---|---|---|---|
  | `read` | Sentence with the blank + learner-language gloss (`getGloss`, `content/gloss.ts:27`) | Tap 1 of 4 | choice |
  | `listen` | Sentence spoken by TTS. Text hidden until answered, with a replay button | Tap 1 of 4 | choice |
  | `type` | Sentence with the blank + gloss | Typed | typed |
  | `speak` | Gloss + sentence with the blank | Said aloud ("Say it"), with "Type instead" available | spoken |

- **Graders in `src/lib/srs/contextGrade.ts`** (named constants; **never `easy`**, so recognition can't inflate FSRS):
  - **choice:** wrong → `again`; correct but slower than `SLOW_MS` (8000 ms) → `hard`; correct → `good`.
  - **typed:** compares `normalizeAnswer` (`lesson/engine.ts:34`) against the surface form, `card.french` or any of `forms`. Exact → `good`, close (via `isClose`, exported from `speech/score.ts:22-39`) → `hard`, otherwise `again`.
  - **spoken:** `scorePronunciation` (`speech/score.ts:53`) gives `good` → `good`, `partial` → `hard`, `retry` → `again`.
  - The grade goes into the existing `recordReview(card, grade, {durationMs, …})` (`srs/review.ts:26`). XP, streak and the review log stay unchanged.
- **UI, in a new `ContextCard.svelte`:**
  - The choices are a `role="radiogroup"` of buttons, ≥44 px and keyboard-operable.
  - After answering, an `aria-live="polite"` line shows the full sentence with the answer highlighted.
  - The learner presses `continue` to move on. Reduced-motion is honored.
  - New test ids: `context-card`, `context-choice`, `context-feedback`, `continue`, `listen-replay`, `recall-input`, `recall-check`, `speak-answer`.
  - The flip fallback keeps `reveal`, `card-back`, `grade-buttons` and `data-grade`.
- **Spoken extraction:** the mic → `transcribe` (`speech/asr.ts:22`) → score wiring moves out of `SpeakExercise.svelte` into `src/lib/speech/recordAndScore.ts`. `SpeakExercise` reuses it with unchanged behavior, and `speak.e2e.ts` guards it. The mic permission prompt happens only after the learner taps "Say it". There's no stored consent flag and none is added.

## Part C: Leech rescue
- A card counts as a leech when `lapses >= LEECH_LAPSES` (3). Before its first appearance in a session, show `LeechRescue.svelte` with:
  - the gender
  - its `forms` (top 4)
  - a faux-ami warning when `fauxAmi` is true (`fauxAmi` is a yes/no flag on the card)
  - the example with its gloss
  - TTS
  - "Got it".
- It shows once per card per session. It is not graded and doesn't change FSRS.
- Copy is encouraging ("This one's slippery, here's a closer look").
- Test id: `leech-rescue`.

## Part D: Recall upgrade
- A card is mature when `stability >= MATURE_STABILITY_DAYS` (21).
- In `read` or `listen` mode, a mature card uses `type` instead of choices. It can use `speak` if it is tagged as a speaking card and the model is ready.
- If a mature card has no blankable sentence, it gets typed recall against its gloss, with the answer being `card.french` or `forms`.

## Part E: Weekly postcard (`/progress`)
- New `reviewLogRepo.getLogsSince(ts)` using `IDBKeyRange.lowerBound` on the existing `ts` index (read-only).
- New pure `src/lib/gamification/weeklyRecap.ts` with `buildWeeklyRecap({logs, stats7d, streak, unitsDone, unitsTotal})`. It returns:
  - reviews
  - **accuracy**: share of reviews that weren't `again`
  - **words recalled**: distinct cards with a review that wasn't `again`
  - XP and lessons, from `statsRepo` over `lastNDayKeys(7)`
  - the current streak
  - voyage progress (units done out of total).
- New `renderWeeklyPostcardPng(recap)` in `share/shareCard.ts`, sharing the canvas and palette helpers with `renderShareCardPng`. Sharing goes through the existing `shareProgress` pipeline.
- The UI is a "This week" card on `/progress`, pull-only, with no notification.
- Test ids: `weekly-postcard`, `share-postcard`.

## Cross-cutting
- **i18n:** every new string goes through Paraglide. English goes in `messages/en.json`. The other 9 locales get English placeholders, logged in `docs/i18n-pending.md`.
- **a11y:** use the `-text` tokens for accent text (`contrast.spec.ts` covers this), plus `IconButton`/`Modal`/`InfoBanner`. Honor `html.reduce-motion` together with `prefersReducedMotion`.
- **Data safety:** no schema, migration or backup-format change. The only new IO is the read-only `getLogsSince`. The `offline-data-safety` gate is not triggered. A reviewer confirms that `recordReview` usage is unchanged.
- **Security:** no new dependency, network call or CSP change. Typed answers are compared locally and never rendered as HTML.

## Delivery: phases, each shippable with tests green
1. **Design doc:**
   - Commit this as `docs/superpowers/specs/2026-11-06-today-coach-contextual-review-design.md`.
   - Then run `superpowers:writing-plans` and save the task plan to `docs/superpowers/plans/2026-11-06-today-coach-contextual-review.md`.
2. **B core (`read` mode + choice grader):**
   - `contextCard.spec.ts` on real pack cards: blanking through `forms`, gender-matched distractors, a deterministic shuffle, the `null` fallback.
   - `contextGrade.spec.ts`: proves `easy` is never returned.
   - Update the review loops in `e2e/helpers`, `app.e2e.ts:39-46` and `accessibility.e2e.ts:56-65` to handle both context and flip cards.
3. **A (Today coach):** `todayPlan.spec.ts` covering all rules, the mode fallbacks and `weakestSkill` tie-breaks. E2E: the today card, then `today-start`, then `/review?mode=…`.
4. **B modes:** `listen`, then `type` (D's typed grader), then `speak` (including the `recordAndScore` extraction). Also D's maturity rule.
5. **C (Leech rescue):** a predicate unit test, plus one E2E test that seeds `lapses=3` through IDB.
6. **E (Weekly postcard):** `weeklyRecap.spec.ts`, a `getLogsSince` test, and a render smoke test in `shareCard.spec.ts`.
7. **Each phase ends with:**
   - TDD (red, then green).
   - A `code-reviewer` pass, plus `pwa-data-reviewer` for phases 2, 4 and 6 (the SRS write path and reviewLog reads).
   - `/spec-sync` (CAP-SRS/CAP-GAME rows, the test baseline) and `npm run spec:validate`.
   - Conventional commits.

## Verification (every phase, from `frenchpath/`)
- `npm run check && npm run lint && npm run test:unit -- --run && npm run build && npm run test:e2e`, all green.
- **Run once before B ships:** a one-off script prints the share of pack cards that get a context prompt. **The target is ≥80%.** If it's lower, revisit blanking or distractor rules first.
- **Manual check with the Playwright MCP on `npm run preview`:**
  - Today card states: review, lesson, rest, and the speak→type fallback hint.
  - Each `?mode=`.
  - A context card in light and dark mode at mobile width, keyboard-only.
  - Leech panel.
  - Typed recall on a seeded mature card.
  - Postcard PNG renders and shares.

## Calls I made (check these)
- If a card has no blankable sentence, it falls back to the flip card. There's no setting to switch modes.
- Constants: `SLOW_MS` 8 s, `LEECH_LAPSES` 3, `MATURE_STABILITY_DAYS` 21, `SECONDS_PER_CARD` 25, batch 20. All are named, so they're easy to tune.
- The Today card lives on `/progress` only. Home stays the voyage map.
- Spoken answers are always started by the learner ("Say it"). The model must already be downloaded, and the browser's mic prompt appears only on tap. There's no consent flag.
- Typed answers accept the surface form, `card.french` or any of `forms`.
- Accuracy and "words recalled" count every grade except `again`.
- Distractors come from the same unit (words the learner has met), then from the same level.

## Parked
- Exam-readiness ETA line.
- Re-tagging content with accurate multi-skill tags, plus part-of-speech tags for better distractors.
- Letting reviews update the skill profile. Today only lessons raise skill levels, so the focus moves slowly.
