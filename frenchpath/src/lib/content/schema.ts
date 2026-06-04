// The content schema is the single source of truth: it validates AI-drafted
// and hand-authored content in CI, and its inferred types drive the runtime.
import { z } from 'zod';

export const cefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1']);

export const skillSchema = z.enum([
	'listening',
	'reading',
	'spokenInteraction',
	'spokenProduction',
	'writing'
]);

/** French nouns carry grammatical gender; other words use 'none'. */
export const genderSchema = z.enum(['masculine', 'feminine', 'none']);

/** A worked example sentence, always in an Indian context. */
export const exampleSchema = z.object({
	french: z.string().min(1),
	englishGloss: z.string().optional(),
	hindiGloss: z.string().optional()
});

/** A vocabulary / grammar card — the unit of spaced repetition. */
export const cardSchema = z.object({
	id: z.string().min(1),
	french: z.string().min(1),
	gender: genderSchema.default('none'),
	ipa: z.string().optional(),
	/** Path to a native-speaker clip under /audio (optional; TTS is the fallback). */
	audioRef: z.string().optional(),
	hindiGloss: z.string().min(1),
	englishGloss: z.string().min(1),
	example: exampleSchema.optional(),
	/** True for false-friends (e.g. librairie = bookshop, not library). */
	fauxAmi: z.boolean().default(false),
	cefrLevel: cefrLevelSchema,
	skills: z.array(skillSchema).default([])
});
export type Card = z.infer<typeof cardSchema>;

// --- Exercises (discriminated on `type`) ---

const exerciseBase = {
	id: z.string().min(1),
	/** Optional link to the card this exercise practises (for SRS crediting). */
	cardId: z.string().optional()
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
	accept: z.array(z.string()).default([]),
	hint: z.string().optional()
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
	accept: z.array(z.string()).default([]),
	hint: z.string().optional()
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

export const exerciseSchema = z.discriminatedUnion('type', [
	mcqExerciseSchema,
	clozeExerciseSchema,
	matchingExerciseSchema,
	dictationExerciseSchema,
	translationExerciseSchema,
	reorderExerciseSchema,
	conjugationExerciseSchema,
	genderExerciseSchema
]);
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseType = Exercise['type'];

/** The "Bridge from Hindi/English" contrastive note shown before exercises. */
export const bridgeBoxSchema = z.object({
	title: z.string().min(1),
	body: z.string().min(1)
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
