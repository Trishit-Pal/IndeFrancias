/**
 * Generates B1, B2, and C1 unit JSON packs from syllabus briefs.
 * Run: npx tsx scripts/seed-b1-c1.ts && npm run content:validate
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SYLLABUS_B1_C1 } from './syllabus-b1-c1.js';

const ROOT = join(import.meta.dirname, '../src/content/packs');

function glossPair(en: string, hi: string) {
	return {
		hi,
		bn: hi,
		ta: en,
		te: en,
		kn: en,
		mr: hi,
		gu: hi,
		pa: hi,
		en
	};
}

function makeUnit(brief: (typeof SYLLABUS_B1_C1)[number]) {
	const level = brief.cefrLevel.toLowerCase();
	const num = brief.id.split('-').pop()!;
	const cardBase = `${level}-u${num}`;

	const cards = brief.vocabWords.map((word, i) => ({
		id: `${cardBase}-c${i + 1}`,
		french: word.fr,
		gender: word.gender ?? 'none',
		hindiGloss: word.hi,
		englishGloss: word.en,
		glosses: glossPair(word.en, word.hi),
		example: {
			french: word.exampleFr,
			englishGloss: word.exampleEn,
			hindiGloss: word.exampleHi,
			glosses: glossPair(word.exampleEn, word.exampleHi)
		},
		fauxAmi: false,
		cefrLevel: brief.cefrLevel,
		skills: word.skills ?? ['reading', 'spokenInteraction']
	}));

	const exercises = [
		{
			id: `${cardBase}-mcq1`,
			type: 'mcq' as const,
			prompt: brief.mcqPrompt,
			options: brief.mcqOptions,
			answerIndex: 0,
			explanation: brief.mcqExplanation,
			hint: brief.hint,
			coachNote: brief.coachNote,
			cardId: cards[0]?.id
		},
		{
			id: `${cardBase}-cloze1`,
			type: 'cloze' as const,
			text: brief.clozeText,
			answer: brief.clozeAnswer,
			accept: [brief.clozeAnswer.toLowerCase()],
			hint: brief.hint,
			cardId: cards[1]?.id
		},
		{
			id: `${cardBase}-trans1`,
			type: 'translation' as const,
			prompt: brief.translationPrompt,
			direction: 'fr-en' as const,
			answer: brief.translationAnswer,
			accept: [],
			hint: 'Look for cognates and tense markers.',
			cardId: cards[2]?.id
		},
		{
			id: `${cardBase}-match1`,
			type: 'matching' as const,
			prompt: 'Match the French word to its meaning',
			pairs: cards.slice(0, 4).map((c) => ({ left: c.french, right: c.englishGloss })),
			hint: brief.hint
		},
		{
			id: `${cardBase}-dict1`,
			type: 'dictation' as const,
			audioText: brief.dictationText,
			answer: brief.dictationText,
			accept: [brief.dictationText.toLowerCase()],
			hint: 'Listen for verb endings and liaisons.',
			cardId: cards[0]?.id
		},
		{
			id: `${cardBase}-reorder1`,
			type: 'reorder' as const,
			prompt: 'Build a correct sentence',
			words: brief.reorderWords,
			hint: brief.hint
		}
	];

	if (brief.cefrLevel === 'C1') {
		exercises.push({
			id: `${cardBase}-read1`,
			type: 'reading' as const,
			passage: brief.readingPassage ?? brief.dictationText,
			questions: [
				{
					prompt: brief.readingQuestion ?? 'What is the main idea?',
					options: brief.readingOptions ?? [
						'Register and nuance',
						'Basic greetings',
						'Numbers only'
					],
					answerIndex: 0
				}
			],
			hint: 'Read for tone and implicit meaning.',
			coachNote: 'C1 texts reward careful reading of connectors.'
		} as (typeof exercises)[number]);
		exercises.push({
			id: `${cardBase}-prod1`,
			type: 'productive' as const,
			prompt: brief.productivePrompt ?? 'Rédigez un paragraphe argumenté sur le thème.',
			modelAnswer: brief.productiveModel ?? 'En somme, il convient de nuancer cette position…',
			rubric: [
				'I used advanced connectors (cependant, en outre, néanmoins)',
				'I maintained appropriate register',
				'I structured an argument with thesis and counterpoint',
				'My vocabulary matches C1 level'
			],
			minChecks: 2,
			hint: 'Plan before writing: intro, développement, conclusion.'
		} as (typeof exercises)[number]);
	}

	return {
		id: brief.id,
		cefrLevel: brief.cefrLevel,
		order: brief.order,
		title: brief.title,
		objective: brief.objective,
		bridge: {
			title: brief.bridgeTitle,
			body: brief.bridgeBody,
			quiz: {
				prompt: brief.bridgeQuizPrompt,
				options: brief.bridgeQuizOptions,
				answerIndex: 0
			}
		},
		cards,
		exercises
	};
}

for (const brief of SYLLABUS_B1_C1) {
	const levelDir = join(ROOT, brief.cefrLevel.toLowerCase());
	if (!existsSync(levelDir)) mkdirSync(levelDir, { recursive: true });
	const file = join(levelDir, `unit-${brief.id.split('-').pop()}.json`);
	writeFileSync(file, JSON.stringify(makeUnit(brief), null, 2) + '\n');
	console.log('Wrote', file);
}

console.log(`Generated ${SYLLABUS_B1_C1.length} units.`);
