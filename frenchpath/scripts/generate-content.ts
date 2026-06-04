/**
 * Build-time content generator (NOT bundled into the app).
 *
 * Drafts A1–A2 lesson units with Claude, validates each against the zod schema,
 * and writes passing drafts to src/content/drafts/ for human curation.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npm run content:generate          # all units
 *   ANTHROPIC_API_KEY=sk-ant-... npm run content:generate a2-unit-01  # one unit
 *
 * Curate drafts (gender, faux-amis, bridge notes, native phrasing), then move
 * them into src/content/packs/<level>/ and run `npm run content:validate`.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { unitSchema } from '../src/lib/content/schema';
import { SYLLABUS, type UnitBrief } from './syllabus';

const MODEL = 'claude-sonnet-4-6';
const DRAFTS_DIR = resolve('src/content/drafts');

const STYLE_GUIDE = `You are a CEFR-certified French curriculum author creating lessons for an app that
teaches French to INDIAN learners (Hindi/English speakers).

Hard rules for every unit you produce:
- Output a SINGLE JSON object matching the Unit schema. No prose, no markdown fences.
- Every vocabulary noun MUST include its grammatical "gender" ("masculine"/"feminine");
  non-nouns use "none". Always include "ipa", "hindiGloss", "englishGloss".
- Use authentic INDIAN-CONTEXT examples: names (Priya, Arjun, Aarav, Ananya), food
  (dal, biryani, chai, thali), festivals (Diwali, Holi, Eid), cities (Mumbai, Jaipur).
- Include a "bridge" box contrasting French with Hindi/English (e.g. Hindi has gender too,
  but assignment differs; warn it is an analogy, not a rule). Front-load faux-amis with
  "fauxAmi": true (e.g. librairie = bookshop, not library).
- Exercises must be solvable and unambiguous. For "cloze", the "text" MUST contain "{{}}".
  For "mcq", "answerIndex" points at the correct option. Keep ~7–9 cards and ~7–9 exercises.
- Keep input ~95% comprehensible for the level; recycle earlier vocabulary.

Unit JSON shape:
{ "id", "cefrLevel", "order", "title", "objective",
  "bridge": { "title", "body" },
  "cards": [ { "id","french","gender","ipa","hindiGloss","englishGloss",
               "example": { "french","englishGloss","hindiGloss" },
               "fauxAmi","cefrLevel","skills":[...] } ],
  "exercises": [
    { "type":"mcq","id","cardId?","prompt","options":[...],"answerIndex","explanation?" },
    { "type":"cloze","id","cardId?","text(with {{}})","answer","accept":[...],"hint?" },
    { "type":"matching","id","prompt?","pairs":[{"left","right"}, ...] },
    { "type":"dictation","id","cardId?","audioText","answer","accept":[...],"hint?" },
    { "type":"translation","id","cardId?","prompt","direction":"fr-en|en-fr","answer","accept":[...] },
    { "type":"reorder","id","prompt?","words":[...ordered] },
    { "type":"conjugation","id","verb","pronoun","prompt?","answer","accept":[...] },
    { "type":"gender","id","cardId?","noun","answer":"masculine|feminine","articleStyle":"definite|indefinite" }
  ] }`;

function exemplar(): string {
	try {
		return readFileSync(resolve('src/content/packs/a1/unit-01.json'), 'utf8');
	} catch {
		return '';
	}
}

function extractJson(text: string): unknown {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	const raw = fenced ? fenced[1] : text;
	const start = raw.indexOf('{');
	const end = raw.lastIndexOf('}');
	if (start === -1 || end === -1) throw new Error('No JSON object found in response');
	return JSON.parse(raw.slice(start, end + 1));
}

function userPrompt(brief: UnitBrief): string {
	return `Create unit "${brief.id}" (${brief.cefrLevel}, order ${brief.order}).
Title: ${brief.title}
Objective (CEFR can-do): ${brief.objective}
Grammar focus: ${brief.grammar}
Vocabulary theme: ${brief.vocab}
Indian context: ${brief.context}
Use a varied mix of these exercise types: ${brief.exerciseTypes.join(', ')}.
Set "id" to "${brief.id}", "cefrLevel" to "${brief.cefrLevel}", "order" to ${brief.order}.
Return ONLY the JSON object.`;
}

async function generateUnit(client: Anthropic, brief: UnitBrief, exemplarJson: string) {
	const response = await client.messages.create({
		model: MODEL,
		max_tokens: 8000,
		system: [
			// Cache the large static guide + exemplar across all units.
			{ type: 'text', text: STYLE_GUIDE, cache_control: { type: 'ephemeral' } },
			{
				type: 'text',
				text: `Reference exemplar (study its quality, then write a NEW unit):\n${exemplarJson}`,
				cache_control: { type: 'ephemeral' }
			}
		],
		messages: [{ role: 'user', content: userPrompt(brief) }]
	});

	const text = response.content
		.filter((b): b is Anthropic.TextBlock => b.type === 'text')
		.map((b) => b.text)
		.join('\n');

	const parsed = extractJson(text);
	return unitSchema.parse(parsed); // throws on invalid -> caller logs + skips
}

async function main() {
	if (!process.env.ANTHROPIC_API_KEY) {
		console.error('ANTHROPIC_API_KEY is not set. Aborting.');
		process.exit(1);
	}

	const only = process.argv[2];
	const briefs = only ? SYLLABUS.filter((b) => b.id === only) : SYLLABUS;
	if (briefs.length === 0) {
		console.error(`No syllabus brief matches "${only}".`);
		process.exit(1);
	}

	mkdirSync(DRAFTS_DIR, { recursive: true });
	const client = new Anthropic();
	const exemplarJson = exemplar();

	let ok = 0;
	for (const brief of briefs) {
		process.stdout.write(`Generating ${brief.id}… `);
		try {
			const unit = await generateUnit(client, brief, exemplarJson);
			writeFileSync(resolve(DRAFTS_DIR, `${unit.id}.json`), JSON.stringify(unit, null, '\t'));
			console.log('ok');
			ok += 1;
		} catch (error) {
			console.log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	console.log(`\nDone: ${ok}/${briefs.length} units written to ${DRAFTS_DIR}.`);
	console.log('Curate them, then move into src/content/packs/<level>/ and run content:validate.');
}

main();
