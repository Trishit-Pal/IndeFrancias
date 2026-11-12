# Interface translations — status

13 interface languages, listed once in `frenchpath/src/lib/i18n/languages.ts`.

| Language   | Code       | Interface state         | Glosses               |
| ---------- | ---------- | ----------------------- | --------------------- |
| English    | `en`       | complete                | complete              |
| Hindi      | `hi`       | complete                | complete              |
| Hinglish   | `hinglish` | complete                | Hindi (shared)        |
| Bengali    | `bn`       | draft, not proofread    | needs work (Stage 3)  |
| Tamil      | `ta`       | draft, not proofread    | needs work (Stage 3)  |
| Telugu     | `te`       | draft, not proofread    | needs work (Stage 3)  |
| Kannada    | `kn`       | draft, not proofread    | needs work (Stage 3)  |
| Marathi    | `mr`       | draft, not proofread    | needs work (Stage 3)  |
| Gujarati   | `gu`       | draft, not proofread    | needs work (Stage 3)  |
| Punjabi    | `pa`       | draft, not proofread    | needs work (Stage 3)  |
| Malayalam  | `ml`       | draft, not proofread    | draft                 |
| Odia       | `or`       | draft, not proofread    | draft                 |
| Assamese   | `as`       | draft, not proofread    | draft                 |

Glosses: the existing bn/gu/pa/mr/ta/te/kn glosses are Hindi transliterated, Hindi, or partly English. The ml/or/as drafts live in `frenchpath/scripts/gloss-drafts/` and fall back to English. For B1/B2/C1 (beta template packs) they translate template text and must be redone after content curation.

## Adding a key

Add it to `messages/en.json` and write real text in all 13 files in the same commit. `src/lib/i18n/localeCoverage.spec.ts` fails if a key is missing, a placeholder differs, or a drafted locale has text outside its own script. No placeholder lists.

## Adding a language

One entry in `src/lib/i18n/languages.ts`, the locale in `project.inlang/settings.json`, a `messages/<code>.json`, and a font rule in `src/lib/theme/tokens.css`. `languages.spec.ts` checks the four agree.

## Proofreading

"Beta" means a draft translation not yet proofread by a native speaker. The per-locale review notes are kept for Stage 3.

## Known follow-up — download size

Owner decision 2026-11-12: all 13 locales compile into one messages chunk that every route preloads and the service worker precaches. With real text it grew from 56 KB to 176 KB gzip (300 KB to 652 KB raw). The home route's preloaded JS went from about 155 KB to about 275 KB gzip, and the precache grew by about 527 KB raw (including about 175 KB of ml/or/as glosses). Accepted for launch. Follow-up: load only the learner's interface language (per-locale message splitting).
