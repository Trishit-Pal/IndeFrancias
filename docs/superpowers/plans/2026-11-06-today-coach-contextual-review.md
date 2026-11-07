# Today Coach + Contextual Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Progress tells the learner what to do today. Review then trains their weakest skill by having them retrieve each word inside its example sentence. Three add-ons come with it: leech rescue, recall upgrade, and a weekly postcard.

**Architecture:** Pure, Node-tested modules hold all the decisions:
- `srs/contextCard.ts` and `srs/contextGrade.ts`
- `gamification/todayPlan.ts` and `gamification/weeklyRecap.ts`

Thin Svelte components render those decisions. The review page chooses a presentation mode per card. Grades still go through the existing `recordReview`, so the FSRS, XP, streak and log paths are unchanged.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Vitest, Playwright, ts-fsrs, Paraglide i18n, Vosk (already installed).

**Spec:** `docs/superpowers/specs/2026-11-06-today-coach-contextual-review-design.md`

All paths are relative to `frenchpath/`, and all commands run there.

## Global Constraints

- No IndexedDB schema change, no migration, no backup-format change. The only new IO is the read-only `reviewLogRepo.getLogsSince`.
- No new dependency, no network call, no CSP change.
- No notifications. The app never prompts for downloads or permissions on its own. The mic prompt appears only after the learner taps "Say it".
- **Never grade `easy`** from any new grader.
- Constants (named, exported): `SLOW_MS = 8000`, `LEECH_LAPSES = 3`, `MATURE_STABILITY_DAYS = 21`, `SECONDS_PER_CARD = 25`. Batch size reuses `DEFAULT_REVIEW_BATCH` (20).
- **Copy:** encouraging, with no guilt or urgency (SPEC invariant 6).
  - Every string goes through Paraglide. English goes in `messages/en.json`.
  - The other 9 locales get the English text as a placeholder, plus one line each in `docs/i18n-pending.md`.
  - Run `npm run i18n:compile` after adding keys.
- **Accessibility:**
  - Accent text uses `--fp-saffron-text`/`--fp-sage-text`.
  - Tap targets are ≥44 px.
  - Every control is keyboard-operable.
  - Feedback is announced through `aria-live="polite"`.
  - Motion is off under `html.reduce-motion` or `prefersReducedMotion.current`.
- **Preserve existing test ids:** `reveal`, `card-back`, `grade-buttons`, `data-grade`, `no-reviews`, `review-done`, `review-summary-*`, `share-review`, and every `/progress` id (`weak-skill`, `skill-profile`, `fsrs-status`, `fsrs-reset`, …).
- Every task: `npm run check && npm run lint && npm run test:unit -- --run` must pass before its commit. Run `npm run test:e2e` when a task touches routes or E2E files.

## Review Focus

1. **The target is sentence-initial and capitalized** ("Dix heures…"). Distractors must use the same capitalization, or the answer is obvious. Pinned in Task 2.
2. **A contracted target** ("C'est l'homme."). The blank keeps the `l'` prefix, and the answer is `homme`. Pinned in Task 2.
3. **A double tap on a choice** records exactly one review. Choices disable after the first selection. Pinned in Task 3.
4. **`?mode=` is missing or garbage** (`?mode=<script>`, `?mode=EASY`). This becomes `read` without an error, and the value is never rendered. Pinned in Task 5.
5. **No French TTS voice, or the Vosk model is missing,** for the focus mode. The plan falls back (`listen`→`read`, `speak`→`type`) and shows the calm hint. It never fires a prompt or a download. Pinned in Task 4.

---

### Task 1: Context graders

**Files:**
- Create: `src/lib/srs/contextGrade.ts`
- Modify: `src/lib/speech/score.ts:36` (export `isClose`, no behavior change)
- Test: `src/lib/srs/contextGrade.spec.ts`

**Interfaces:**
- Consumes:
  - `ReviewGrade` (`srs/fsrs.ts:19`)
  - `normalizeAnswer(value: string): string` (`lesson/engine.ts:34`)
  - `isClose(a: string, b: string): boolean` (`speech/score.ts`, now exported)
  - `PronunciationScore['overall']`: `'good' | 'partial' | 'retry'`
- Produces:
  - `export const SLOW_MS = 8000`
  - `gradeChoice(correct: boolean, durationMs: number): ReviewGrade`
  - `gradeTyped(input: string, accepted: readonly string[]): ReviewGrade`
  - `gradeSpoken(overall: 'good' | 'partial' | 'retry'): ReviewGrade`

- [ ] **Step 1: Write the failing tests**

```ts
describe('gradeChoice', () => {
  it('wrong → again', () => expect(gradeChoice(false, 1000)).toBe('again'));
  it('correct & quick → good', () => expect(gradeChoice(true, 2000)).toBe('good'));
  it('correct & slow → hard', () => expect(gradeChoice(true, SLOW_MS + 1)).toBe('hard'));
});
describe('gradeTyped', () => {
  const accepted = ['dix'];
  it('exact (accent/case-insensitive) → good', () => expect(gradeTyped('  DIX ', accepted)).toBe('good'));
  it('typo → hard', () => expect(gradeTyped('dis', ['diz', 'dix'])).toBe('hard'));
  it('wrong → again', () => expect(gradeTyped('onze', accepted)).toBe('again'));
  it('empty → again', () => expect(gradeTyped('', accepted)).toBe('again'));
  it('any accepted form → good', () => expect(gradeTyped('suis', ['être', 'suis', 'es'])).toBe('good'));
});
describe('gradeSpoken', () => {
  it.each([['good', 'good'], ['partial', 'hard'], ['retry', 'again']] as const)('%s → %s',
    (o, g) => expect(gradeSpoken(o)).toBe(g));
});
it('never returns easy', () => {
  const all = [gradeChoice(true, 0), gradeTyped('dix', ['dix']), gradeSpoken('good')];
  expect(all).not.toContain('easy');
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

`npx vitest run src/lib/srs/contextGrade.spec.ts`. Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Implement**

In `contextGrade.ts`, `gradeTyped` normalizes both sides with `normalizeAnswer`. An empty input gives `again`. An exact match against any accepted form gives `good`. `isClose` against any form gives `hard`. Anything else gives `again`. Then export `isClose` from `speech/score.ts`.

- [ ] **Step 4: Run the tests and confirm they pass.** Also run `npx vitest run src/lib/speech` and check that `score.spec.ts` is unchanged and green.

- [ ] **Step 5: Commit**

`git add src/lib/srs/contextGrade.* src/lib/speech/score.ts && git commit -m "feat(srs): context review graders (never easy)"`

---

### Task 2: Context prompt builder

**Files:**
- Create: `src/lib/srs/contextCard.ts`
- Test: `src/lib/srs/contextCard.spec.ts`

**Interfaces:**
- Consumes:
  - `Card` (`content/schema.ts:84`)
  - `tokenizeFrench`, `normalizeFrenchToken`, `stripContraction` (`content/lexicon.ts`)
- Produces:
  - `export interface ContextPrompt { before: string; answer: string; after: string; choices: string[] /* length 4, includes answer */; accepted: string[] /* answer, card.french, ...card.forms */ }`
  - `export interface CandidateCard { card: Card; unitId: string }`
  - `buildContextPrompt(card: Card, unitId: string, candidates: readonly CandidateCard[], seed: string): ContextPrompt | null`

**Blanking rule:**
1. Walk the `word` tokens of `card.example.french`.
2. For each token `t`, compute `k = normalizeFrenchToken(stripContraction(t))`.
3. A token matches if `k` equals the normalized `card.french` or any normalized `forms` entry.
4. Cut at the first match. If the token had a contraction prefix, the prefix stays in `before`, and `answer` is the remainder in its original casing.
5. Return `null` if nothing matches or if `card.example` is missing.

**Distractor rule:**
1. Order the candidates: same `unitId` first, then same `cefrLevel`.
2. Keep a candidate only if:
   - it isn't the same card;
   - when `card.gender !== 'none'`, its `gender` matches;
   - its normalized `french` isn't the answer, isn't any normalized word in the sentence, and isn't already chosen.
3. Take 3. If fewer than 3 qualify, return `null`.
4. If the answer is sentence-initial and capitalized, capitalize each distractor's first letter.
5. Shuffle the 4 choices with a PRNG seeded by `seed` (`cardId`): FNV-1a hash, then mulberry32, then Fisher-Yates. Add the ponytail comment from the spec.

- [ ] **Step 1: Write the failing tests**

Build small `Card` fixtures with zod defaults, through `cardSchema.parse`.

```ts
it('blanks the target inside its example', () => {
  const p = buildContextPrompt(dix, 'a1-unit-03', pool, 'c1')!;
  expect(p.before + '___' + p.after).toBe('Il est ___ heures.');
  expect(p.answer).toBe('dix');
  expect(p.choices).toHaveLength(4);
  expect(p.choices).toContain('dix');
});
it('matches via forms and keeps the surface form', () => {
  expect(buildContextPrompt(etre /* forms: ['suis',…], example 'Je suis indien.' */, 'u', pool, 's')!.answer).toBe('suis');
});
it('keeps a contraction prefix outside the blank', () => {
  const p = buildContextPrompt(homme /* "C'est l'homme." */, 'u', pool, 's')!;
  expect(p.before).toBe("C'est l'"); expect(p.answer).toBe('homme');
});
it('capitalizes distractors when the answer is sentence-initial', () => {
  const p = buildContextPrompt(dixInitial /* "Dix heures, c'est tard." */, 'u', pool, 's')!;
  expect(p.choices.every((c) => /^\p{Lu}/u.test(c))).toBe(true);
});
it('distractors share gender for nouns and never duplicate the answer or sentence words', …);
it('same seed → same order; different seed → (for this fixture) different order', …);
it('returns null when the word is absent from the example', …);
it('returns null when fewer than 3 distractors qualify', …);
it('covers ≥80% of real pack cards', async () => {
  // listUnitSummaries() + loadUnit() for every unit; candidates = all cards of the same CEFR level
  // expect(prompted / total).toBeGreaterThanOrEqual(0.8)
});
```

- [ ] **Step 2: Run the tests and confirm they fail** (`npx vitest run src/lib/srs/contextCard.spec.ts`).

- [ ] **Step 3: Implement `buildContextPrompt`** following the rules above.

- [ ] **Step 4: Run the tests and confirm they pass.** If the coverage test is under 80%, print which cards return `null` and why. Fix the blanking (for example, elision forms) before continuing. **Don't lower the threshold.**

- [ ] **Step 5: Commit**

`feat(srs): contextual cloze prompt builder with seeded distractors`

---

### Task 3: Context card in review (`read` mode + flip fallback)

**Files:**
- Create: `src/lib/srs/ContextCard.svelte`
- Modify: `src/routes/review/+page.svelte` (`resolveContent` 78-95, card render 133-216, `grade` 97-118)
- Modify: `e2e/helpers.ts` (add `reviewUntilDone`), `e2e/app.e2e.ts:39-46`, `e2e/accessibility.e2e.ts:56-65`
- Modify: `messages/*.json`, `docs/i18n-pending.md`

**Interfaces:**
- Consumes: `buildContextPrompt`/`ContextPrompt` (Task 2), `gradeChoice` (Task 1), `getGloss` (`content/gloss.ts:27`), and the existing `recordReview(card, grade, {durationMs, …})`.
- Produces:
  - `ContextCard.svelte` with props `{ prompt: ContextPrompt; mode: ReviewMode; gloss: string; onAnswered: (grade: ReviewGrade, durationMs: number) => void }`. `ReviewMode` comes from Task 4 (`gamification/todayPlan.ts`). Until Task 4 lands, declare the prop as `mode?: 'read'` and render only the read mode.
  - E2E helper `reviewUntilDone(page)`.

- [ ] **Step 1: Update the E2E tests first (they fail).**
  - `reviewUntilDone(page)`: loop until `review-done` is visible. On each card:
    - If `context-card` is visible: click the first `context-choice`, assert all choices are disabled, then click `continue`.
    - Otherwise: click `reveal`, then `[data-grade="good"]`.
  - Replace the loop in `app.e2e.ts:39-46` with `reviewUntilDone(page)`.
  - In `accessibility.e2e.ts`, if a `context-card` shows: focus the first `context-choice`, press Enter, and expect `context-feedback` to have `aria-live="polite"`. Otherwise keep the existing check of the grade button.
  - Add a test for Review Focus #3: double-click a `context-choice`, finish the session, and expect `review-summary-cards` to equal the queue length.
- [ ] **Step 2: Run** `npx playwright test e2e/app.e2e.ts e2e/accessibility.e2e.ts`. Expected: the new assertions fail, because `context-card` doesn't exist yet.
- [ ] **Step 3: Implement.**
  - **`resolveContent`:** load every queue unit once with `loadUnit`, then build `candidates` from all of their cards. For each card, store `prompt = buildContextPrompt(content, unitId, candidates, cardId)`.
  - **Render:** if `prompt` exists, render `ContextCard`. Otherwise render today's flip card, unchanged.
  - **`ContextCard`:**
    - Shows the sentence, with `answer` replaced by a blank, and the gloss.
    - The choices are a `role="radiogroup"` of buttons (`context-choice`).
    - The first selection records `durationMs` from mount, disables all choices, and shows `context-feedback` (aria-live) with the full sentence and the answer highlighted.
    - `continue` calls `onAnswered(gradeChoice(isCorrect, durationMs), durationMs)`.
  - **Page:** routes `onAnswered` into the existing `grade()` path. Refactor `grade(g: ReviewGrade, durationMs?)` so the context cards and the grade buttons share it.
  - **i18n keys:** `review_context_continue`, `review_context_correct`, `review_context_answer` (with an `{answer}` parameter).
- [ ] **Step 4: Run** `npm run test:unit -- --run && npm run build && npx playwright test`, all green.
- [ ] **Step 5: Manual check** with the Playwright MCP on `npm run preview`, at a mobile width (390 px), in light and dark mode, keyboard only.
- [ ] **Step 6: Review gate:** dispatch `pwa-data-reviewer` on the diff. Confirm the `recordReview` call path and arguments are unchanged.
- [ ] **Step 7: Commit:** `feat(review): contextual 4-choice cards with flip fallback`

---

### Task 4: Today plan (pure)

**Files:**
- Create: `src/lib/gamification/todayPlan.ts`
- Modify: `src/lib/gamification/adaptiveSuggestions.ts:13-22` (use `weakestSkill`)
- Test: `src/lib/gamification/todayPlan.spec.ts`

**Interfaces:**
- Consumes: `Skill`, `SkillProfileRecord`, `CefrLevel` (`db/schema.ts`), `DailyGoal` (`gamification/activity.ts:14`), `DEFAULT_REVIEW_BATCH` (`srs/queue.ts:5`).
- Produces:
  - `export type ReviewMode = 'read' | 'listen' | 'type' | 'speak'`
  - `export interface Caps { tts: boolean; asr: boolean }`
  - `export const SECONDS_PER_CARD = 25`
  - `weakestSkill(profiles: readonly SkillProfileRecord[]): Skill | null`. The lowest CEFR level wins. Ties break in the order `listening, reading, writing, spokenProduction, spokenInteraction`.
  - `focusMode(skill: Skill | null, caps: Caps): { mode: ReviewMode; fallbackHint: 'tts' | 'asr' | null }`
  - `export interface TodayPlan { kind: 'review' | 'lesson' | 'rest'; mode: ReviewMode; cardCount: number; minutes: number; fallbackHint: 'tts' | 'asr' | null }`
  - `buildTodayPlan(input: { dueCount: number; focusSkill: Skill | null; caps: Caps; goal: DailyGoal; hasLessonsLeft: boolean }): TodayPlan`

- [ ] **Step 1: Write the failing tests:**
  - `weakestSkill`: the lowest level wins, the tie-break order holds, and an empty list gives `null`.
  - `focusMode`:
    - listening with `tts:true` → `listen`; with `tts:false` → `read` plus hint `'tts'`.
    - writing → `type`.
    - spokenProduction with `asr:true` → `speak`; with `asr:false` → `type` plus hint `'asr'`.
    - reading or `null` → `read`.
  - `buildTodayPlan`:
    - With 30 due, the plan is `review` with `cardCount` 20 and `minutes` `Math.round(20*25/60)` = 8.
    - With 0 due, the goal unmet and lessons left, the plan is `lesson`.
    - With 0 due and the goal met, the plan is `rest`.
    - With 0 due, the goal unmet and no lessons left, the plan is `rest`.
    - `minutes` is at least 1 whenever `cardCount` is greater than 0.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.** Then make `suggestUnitForWeakSkill` call `weakestSkill` instead of its inline sort, and confirm `adaptiveSuggestions.spec.ts` stays green.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `feat(gamification): today plan + shared weakestSkill`

---

### Task 5: Today card on `/progress` + `?mode=` parsing

**Files:**
- Create: `src/lib/gamification/TodayCard.svelte`, `src/lib/srs/reviewMode.ts`
- Modify: `src/routes/progress/+page.svelte` (put `TodayCard` above the existing widgets; replace the inline `weakestSkill` `$derived` at 75-81 with the import)
- Modify: `src/routes/review/+page.svelte` (read the mode)
- Test: `src/lib/srs/reviewMode.spec.ts`, plus a new `e2e/today.e2e.ts`
- Modify: `messages/*.json`, `docs/i18n-pending.md`

**Interfaces:**
- Consumes: Task 4 exports. Also `countDue` (`srs/queue.ts:16`), `dailyGoalProgress`, `ttsAvailable` + `listFrenchVoices` (`audio/tts.ts`), and `getModelStatus` (`speech/modelSource.ts:19`).
- Produces:
  - `parseReviewMode(raw: string | null): ReviewMode`, which returns `'read'` for anything that isn't in the union.
  - The `TodayCard` test ids `today-card` and `today-start`.

- [ ] **Step 1: Write the failing tests.**
  - Unit: `parseReviewMode` maps `null`, `''`, `'EASY'` and `'<script>'` to `'read'`, and passes the 4 valid values through unchanged.
  - E2E (`today.e2e.ts`):
    - On a fresh install, after one lesson, `/progress` shows `today-card`.
    - `today-start` goes to `/review?mode=…`, and the review loads (`reviewUntilDone` from Task 3).
    - With nothing due and the goal met, the card shows the rest copy. Seed this through IDB with the existing helpers' patterns.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
  - The caps are computed on `/progress`: `tts = ttsAvailable() && (await voicesReady()).some(isFrenchVoice)` and `asr = (await getModelStatus()) === 'ready'`. Neither call triggers a download or a prompt.
  - `TodayCard` uses `InfoBanner` and an `IconButton` or link.
  - The fallback hint links to `/settings` and doesn't prompt.
  - The review page passes `parseReviewMode(page.url.searchParams.get('mode'))` to `ContextCard`. Only `read` is rendered for now; Task 6 adds the rest. The raw value is never rendered.
  - **i18n keys:** `today_title`, `today_review` (`{count}`, `{minutes}`, `{mode}`), `today_lesson`, `today_rest`, `today_hint_tts`, `today_hint_asr`, `today_start`, plus `review_mode_read|listen|type|speak`.
- [ ] **Step 4: Run** `npm run test:unit -- --run && npm run build && npx playwright test`, all green.
- [ ] **Step 5: Commit:** `feat(progress): Today coach card linking to focused review`

---

### Task 6: Listen and type modes + recall upgrade

**Files:**
- Modify: `src/lib/srs/ContextCard.svelte`, `src/lib/srs/reviewMode.ts`
- Test: `src/lib/srs/reviewMode.spec.ts`, `e2e/review-modes.e2e.ts`

**Interfaces:**
- Consumes: `gradeTyped` (Task 1), `ContextPrompt.accepted` (Task 2), `speakFrench` (`audio/tts.ts:104`), `SrsCard.stability`.
- Produces:
  - `export const MATURE_STABILITY_DAYS = 21`
  - `presentationFor(card: SrsCard, mode: ReviewMode, hasPrompt: boolean, caps: Caps, isSpeakingCard: boolean): ReviewMode | 'flip'`

  **Rules for `presentationFor`:**
  - No prompt and not mature → `'flip'`.
  - No prompt and mature → `'type'`, against the gloss, with `accepted = [card.french, ...forms]`.
  - Mature and mode is `read` or `listen` → `speak` if `isSpeakingCard && caps.asr`, otherwise `type`.
  - `listen` without `caps.tts` → `read`.
  - Otherwise → `mode`.

- [ ] **Step 1: Write the failing tests:** a unit table covering every `presentationFor` branch. E2E, with the TTS stubbed the way `e2e/tts.e2e.ts` does it:
  - `/review?mode=listen` shows `listen-replay`, and the sentence text is hidden until a choice is made.
  - `/review?mode=type` shows `recall-input`. Typing the answer and pressing `recall-check` shows `context-feedback`.
  - A mature card seeded through IDB (`stability: 30`) shows `recall-input` even in `read` mode.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement the modes in `ContextCard`.**
  - **`listen`:** `speakFrench(full sentence)` on mount and on `listen-replay`. The text is revealed in the feedback.
  - **`type`:** `recall-input` and `recall-check`, using `gradeTyped(input, accepted)`. The input value is shown only as text, never with `{@html}`.
  - A gloss-only typed variant handles the case with no prompt.
- [ ] **Step 4: Run all suites and confirm they pass.**
- [ ] **Step 5: Commit:** `feat(review): listen + type modes and recall upgrade for mature cards`

---

### Task 7: Speak mode (`recordAndScore` extraction)

**Files:**
- Create: `src/lib/speech/recordAndScore.ts`
- Modify: `src/lib/lesson/exercises/SpeakExercise.svelte` (use the extraction; behavior unchanged), `src/lib/srs/ContextCard.svelte`
- Test: the existing `e2e/speak.e2e.ts` must stay green; add a speak-mode case in `e2e/review-modes.e2e.ts`

**Interfaces:**
- Consumes: `transcribe` (`speech/asr.ts:28`), `scorePronunciation` (`speech/score.ts:53`), `gradeSpoken` (Task 1).
- Produces: `startRecording(): Promise<{ stop(expected: string): Promise<PronunciationScore>; cancel(): void }>`. It owns the `getUserMedia`, AudioContext and track cleanup that `SpeakExercise` does today.

- [ ] **Step 1: Write the speak-mode E2E first**, using the existing ASR `localStorage` stub from `speak.e2e.ts`. On `/review?mode=speak`, a speaking-tagged card shows `speak-answer`. Record, then stop, and `context-feedback` appears. "Type instead" switches to `recall-input`.
- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Move the mic and transcribe logic** out of `SpeakExercise.svelte` into `recordAndScore.ts`. Preserve the double-tap mic-leak guard and the track cleanup exactly. Use it from `SpeakExercise` and from `ContextCard` (`speak` mode, which grades with `gradeSpoken`).
- [ ] **Step 4: Run** `npx playwright test e2e/speak.e2e.ts e2e/review-modes.e2e.ts` and the full suites, all green.
- [ ] **Step 5: Commit:** `feat(review): speak mode via shared recordAndScore`

---

### Task 8: Leech rescue

**Files:**
- Create: `src/lib/srs/leech.ts`, `src/lib/srs/LeechRescue.svelte`
- Modify: `src/routes/review/+page.svelte`, `messages/*.json`, `docs/i18n-pending.md`
- Test: `src/lib/srs/leech.spec.ts`, plus a case in `e2e/review-modes.e2e.ts`

**Interfaces:**
- Produces: `export const LEECH_LAPSES = 3` and `isLeech(card: SrsCard): boolean`.

- [ ] **Step 1: Write the failing tests.**
  - Unit: `isLeech` is false at `lapses: 2` and true at `lapses: 3`.
  - E2E: seed a due card with `lapses: 3` through IDB. `leech-rescue` shows before it, and "Got it" reveals the card. The rescue panel shows only once per session, even if the card comes back.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
  - **Panel content:** the gender, the first 4 `forms`, a faux-ami warning when `fauxAmi` is true, the example with its gloss, and a TTS button.
  - The page keeps a session-local `Set<cardId>` of cards already rescued.
  - The panel is not graded.
  - **i18n keys:** `leech_title`, `leech_body`, `leech_faux_ami`, `leech_got_it`.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `feat(review): leech rescue panel`

---

### Task 9: Weekly postcard

**Files:**
- Modify: `src/lib/db/repositories/reviewLog.ts` (add `getLogsSince`), `src/lib/share/shareCard.ts` (add a renderer), `src/routes/progress/+page.svelte`
- Create: `src/lib/gamification/weeklyRecap.ts`, `src/lib/gamification/WeeklyPostcard.svelte`
- Test: `reviewLog.spec.ts` (extend), `src/lib/gamification/weeklyRecap.spec.ts`, `shareCard.spec.ts` (extend)

**Interfaces:**
- Produces:
  - `getLogsSince(ts: number): Promise<ReviewLogRecord[]>`, which uses `IDBKeyRange.lowerBound(ts)` on the `ts` index.
  - `export interface WeeklyRecap { reviews: number; accuracy: number /* 0–100, grade>1 share */; wordsRecalled: number; xp: number; lessons: number; streak: number; unitsDone: number; unitsTotal: number }`
  - `buildWeeklyRecap(input: { logs: readonly ReviewLogRecord[]; stats: readonly DailyStats[]; streak: number; unitsDone: number; unitsTotal: number }): WeeklyRecap`
  - `renderWeeklyPostcardPng(recap: WeeklyRecap, labels: Record<string, string>): Promise<Blob | null>`
  - `sharePostcard(recap, labels): Promise<boolean>`. It reuses the fallback chain in `shareProgress`, so refactor that chain into a private `shareBlob(blob, text)`.

- [ ] **Step 1: Write the failing tests.**
  - `getLogsSince`: with fake-indexeddb, as in the existing `reviewLog.spec.ts`, it returns only logs with `ts` at or after the bound.
  - `buildWeeklyRecap`:
    - accuracy counts every grade except `again` (grade > 1), so `hard` counts as correct;
    - `wordsRecalled` counts distinct `cardId`s with any grade > 1;
    - empty input gives all zeros, with no `NaN`.
  - The render returns either a `Blob` or `null`, following the pattern of the existing render test.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
  - `/progress` gets a "This week" card (`weekly-postcard`) and a `share-postcard` button.
  - The data comes from `getLogsSince(Date.now() - 7*864e5)`, `statsRepo` over `lastNDayKeys(7)`, `streakRepo.getStreak()`, and the existing progress counts.
  - Postcard text uses the `-text` tokens.
- [ ] **Step 4: Run the tests and confirm they pass.** Then run the Playwright MCP check: the PNG renders and the share flow falls back to a download in Chromium.
- [ ] **Step 5: Review gate:** dispatch `pwa-data-reviewer`, which confirms that `getLogsSince` is read-only and that no backup or schema impact exists.
- [ ] **Step 6: Commit:** `feat(progress): weekly postcard recap + share`

---

### Task 10: Spec sync + whole-branch gate

- [ ] **Step 1:** `npm run check && npm run lint && npm run test:unit -- --run && npm run build && npm run test:e2e`, all green. Record the new unit and E2E counts.
- [ ] **Step 2:** Run `/spec-sync`, the `frenchpath-spec-sync` skill. This is MEDIUM: CAP-SRS gets contextual review and modes, CAP-GAME gets the Today coach and the weekly postcard, and the §5 test baseline changes. Then `npm run spec:validate`. Also update the test counts in `AGENTS.md` (that ADR-8 item is still open).
- [ ] **Step 3:** A whole-branch review: one fresh `code-reviewer` on the most capable model over `git diff <start-sha>...HEAD`. Fix CRITICAL and HIGH findings.
- [ ] **Step 4:** Commit: `docs: spec-sync Today coach + contextual review`.
