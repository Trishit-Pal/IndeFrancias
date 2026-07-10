// The content schema is the single source of truth: it validates AI-drafted
// and hand-authored content in CI, and its inferred types drive the runtime.
import { z } from 'zod';

export const cefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1']);

/** Levels whose French is still AI-drafted and shown as clearly-labelled beta
 *  until a native-speaker proofread lands (SPEC invariant 5). */
export const BETA_LEVELS: ReadonlySet<z.infer<typeof cefrLevelSchema>> = new Set([
	'B1',
	'B2',
	'C1'
]);

export const skillSchema = z.enum([
	'listening',
	'reading',
	'spokenInteraction',
	'spokenProduction',
	'writing'
]);

/** French nouns carry grammatical gender; other words use 'none'. */
export const genderSchema = z.enum(['masculine', 'feminine', 'none']);

export const nativeLangSchema = z.enum(['hi', 'bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'en']);

/** A build-time-authored writing feedback rule; runs as a regex over the
 *  learner's normalized answer. Lives in content packs so the native
 *  proofreader reviews it like any French content. */
export const rubricRuleSchema = z.object({
	id: z.string().min(1),
	/** Regex source, tested against the normalized answer (see lesson/engine). */
	match: z.string().min(1),
	hint: z.string().min(1),
	// ponytail: partialRecord, not record — z.record(enum, ...) demands every
	// enum key present. Content only ever supplies a few languages per rule.
	hintByLang: z.partialRecord(nativeLangSchema, z.string()).optional(),
	severity: z.enum(['gentle', 'correction'])
});
export type RubricRule = z.infer<typeof rubricRuleSchema>;

export const glossesSchema = z.object({
	hi: z.string().min(1),
	bn: z.string().min(1),
	ta: z.string().min(1),
	te: z.string().min(1),
	kn: z.string().min(1),
	mr: z.string().min(1),
	gu: z.string().min(1),
	pa: z.string().min(1),
	en: z.string().min(1)
});

/** A worked example sentence, always in an Indian context. */
export const exampleSchema = z.object({
	french: z.string().min(1),
	englishGloss: z.string().optional(),
	hindiGloss: z.string().optional(),
	glosses: glossesSchema.optional()
});

/** A vocabulary / grammar card — the unit of spaced repetition. */
export const cardSchema = z
	.object({
		id: z.string().min(1),
		french: z.string().min(1),
		gender: genderSchema.default('none'),
		ipa: z.string().optional(),
		audioRef: z.string().optional(),
		hindiGloss: z.string().min(1).optional(),
		englishGloss: z.string().min(1).optional(),
		glosses: glossesSchema.optional(),
		/** Common inflected forms for tap-to-gloss lookup (e.g. conjugations). */
		forms: z.array(z.string().min(1)).optional(),
		example: exampleSchema.optional(),
		fauxAmi: z.boolean().default(false),
		cefrLevel: cefrLevelSchema,
		skills: z.array(skillSchema).default([])
	})
	.refine((c) => c.glosses || (c.hindiGloss && c.englishGloss), {
		message: 'Card must have glosses{} or legacy hindiGloss + englishGloss'
	});
export type Card = z.infer<typeof cardSchema>;

// --- Exercises (discriminated on `type`) ---

const exerciseBase = {
	id: z.string().min(1),
	/** Optional link to the card this exercise practises (for SRS crediting). */
	cardId: z.string().optional(),
	hint: z.string().optional(),
	coachNote: z.string().optional(),
	/** French tokens in the prompt to always make tappable (even if not in lexicon). */
	promptGlosses: z.array(z.string().min(1)).optional(),
	/** Optional writing-feedback rules (WP1); free-text exercises only. */
	rubricRules: z.array(rubricRuleSchema).optional()
};

export const mcqExerciseSchema = z.object({
	type: z.literal('mcq'),
	...exerciseBase,
	prompt: z.string().min(1),
	options: z.array(z.string().min(1)).min(2),
	answerIndex: z.number().int().nonnegative(),
	explanation: z.string().optional()
});

export const clozeExerciseSchema = z.object({
	type: z.literal('cloze'),
	...exerciseBase,
	/** Sentence with `{{}}` marking the blank to fill. */
	text: z.string().includes('{{}}'),
	answer: z.string().min(1),
	/** Additional accepted answers (matched case-/accent-insensitively). */
	accept: z.array(z.string()).default([])
});

export const matchingExerciseSchema = z.object({
	type: z.literal('matching'),
	...exerciseBase,
	prompt: z.string().optional(),
	pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2)
});

/** Listen (TTS) to French, then type what you hear. */
export const dictationExerciseSchema = z.object({
	type: z.literal('dictation'),
	...exerciseBase,
	/** The French sentence spoken aloud and to be transcribed. */
	audioText: z.string().min(1),
	answer: z.string().min(1),
	accept: z.array(z.string()).default([])
});

/** Translate a prompt in the given direction. */
export const translationExerciseSchema = z.object({
	type: z.literal('translation'),
	...exerciseBase,
	prompt: z.string().min(1),
	direction: z.enum(['fr-en', 'en-fr']).default('fr-en'),
	answer: z.string().min(1),
	accept: z.array(z.string()).default([])
});

/** Reorder a word bank into the correct sentence. */
export const reorderExerciseSchema = z.object({
	type: z.literal('reorder'),
	...exerciseBase,
	prompt: z.string().optional(),
	/** The words in their correct order. */
	words: z.array(z.string().min(1)).min(2)
});

/** Produce the correct conjugated form for a verb + pronoun. */
export const conjugationExerciseSchema = z.object({
	type: z.literal('conjugation'),
	...exerciseBase,
	verb: z.string().min(1),
	pronoun: z.string().min(1),
	prompt: z.string().optional(),
	answer: z.string().min(1),
	accept: z.array(z.string()).default([])
});

/** Decide the grammatical gender of a noun (le/la or un/une). */
export const genderExerciseSchema = z.object({
	type: z.literal('gender'),
	...exerciseBase,
	noun: z.string().min(1),
	answer: z.enum(['masculine', 'feminine']),
	articleStyle: z.enum(['definite', 'indefinite']).default('definite')
});

const readingQuestionSchema = z.object({
	prompt: z.string().min(1),
	options: z.array(z.string().min(1)).min(2),
	answerIndex: z.number().int().nonnegative()
});

/** Long-form reading with comprehension questions (C1). */
export const readingExerciseSchema = z.object({
	type: z.literal('reading'),
	...exerciseBase,
	passage: z.string().min(1),
	questions: z.array(readingQuestionSchema).min(1)
});

/** Extended listening passage + dictation-style answer. */
export const listeningExerciseSchema = z.object({
	type: z.literal('listening'),
	...exerciseBase,
	audioText: z.string().min(1),
	passage: z.string().optional(),
	answer: z.string().min(1),
	accept: z.array(z.string()).default([])
});

/** Self-assessed productive task with rubric (writing/speaking). */
export const productiveExerciseSchema = z.object({
	type: z.literal('productive'),
	...exerciseBase,
	prompt: z.string().min(1),
	modelAnswer: z.string().min(1),
	rubric: z.array(z.string().min(1)).min(1),
	minChecks: z.number().int().min(1).default(2)
});

export const exerciseSchema = z.discriminatedUnion('type', [
	mcqExerciseSchema,
	clozeExerciseSchema,
	matchingExerciseSchema,
	dictationExerciseSchema,
	translationExerciseSchema,
	reorderExerciseSchema,
	conjugationExerciseSchema,
	genderExerciseSchema,
	readingExerciseSchema,
	listeningExerciseSchema,
	productiveExerciseSchema
]);
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseType = Exercise['type'];

/** The "Bridge from Hindi/English" contrastive note shown before exercises. */
export const bridgeQuizSchema = z.object({
	prompt: z.string().min(1),
	options: z.array(z.string().min(1)).min(2),
	answerIndex: z.number().int().nonnegative()
});

export const bridgeBoxSchema = z.object({
	title: z.string().min(1),
	body: z.string().min(1),
	/** Per-language bridge copy (optional; legacy title/body used as fallback). */
	titleByLang: z.record(nativeLangSchema, z.string()).optional(),
	bodyByLang: z.record(nativeLangSchema, z.string()).optional(),
	/** Optional micro-quiz before exercises. */
	quiz: bridgeQuizSchema.optional()
});
export type BridgeBox = z.infer<typeof bridgeBoxSchema>;

/** A bite-sized lesson unit (~5–10 min). */
export const unitSchema = z.object({
	id: z.string().min(1),
	cefrLevel: cefrLevelSchema,
	order: z.number().int().nonnegative(),
	title: z.string().min(1),
	/** Learning objective, paraphrased from a CEFR can-do descriptor. */
	objective: z.string().min(1),
	bridge: bridgeBoxSchema.optional(),
	cards: z.array(cardSchema).default([]),
	exercises: z.array(exerciseSchema).min(1)
});
export type Unit = z.infer<typeof unitSchema>;

/** Lightweight unit metadata for the path map (no exercises/cards loaded). */
export const unitSummarySchema = z.object({
	id: z.string().min(1),
	cefrLevel: cefrLevelSchema,
	order: z.number().int().nonnegative(),
	title: z.string().min(1),
	objective: z.string().min(1)
});
export type UnitSummary = z.infer<typeof unitSummarySchema>;

export const manifestSchema = z.array(unitSummarySchema);
export type Manifest = z.infer<typeof manifestSchema>;
