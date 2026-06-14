/**
 * Automated French content QA flags for human proof-readers.
 * Exits non-zero when any issue is found.
 *
 *   npm run content:proofread
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { unitSchema, type Unit, type Exercise } from '../src/lib/content/schema';

const PACKS_DIR = resolve('src/content/packs');
/** English function words that should not appear in French vocabulary fields. */
const ENGLISH_IN_FRENCH = /\b(the|hello|goodbye)\b/i;

function packFiles(): string[] {
	return readdirSync(PACKS_DIR, { recursive: true })
		.map(String)
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(PACKS_DIR, f));
}

function frenchStringsFromExercise(ex: Exercise): string[] {
	const out: string[] = [];
	switch (ex.type) {
		case 'cloze':
			out.push(ex.answer, ...ex.accept);
			break;
		case 'dictation':
			out.push(ex.answer, ...ex.accept);
			break;
		case 'translation':
			if (ex.direction === 'en-fr') out.push(ex.answer, ...ex.accept);
			break;
		case 'reorder':
			out.push(...ex.words);
			break;
		case 'conjugation':
			out.push(ex.answer, ...ex.accept);
			break;
		case 'matching':
			for (const p of ex.pairs) out.push(p.left);
			break;
		case 'gender':
			out.push(ex.noun);
			break;
	}
	return out.filter(Boolean);
}

function checkUnit(unit: Unit, file: string): string[] {
	const issues: string[] = [];
	const cardIds = new Map<string, number>();

	for (const card of unit.cards) {
		cardIds.set(card.id, (cardIds.get(card.id) ?? 0) + 1);
		if (ENGLISH_IN_FRENCH.test(card.french)) {
			issues.push(`${file}: card ${card.id} — English in french field: "${card.french}"`);
		}
	}

	for (const [id, count] of cardIds) {
		if (count > 1) issues.push(`${file}: duplicate card id "${id}" (${count}×)`);
	}

	for (const ex of unit.exercises) {
		for (const field of frenchStringsFromExercise(ex)) {
			if (ENGLISH_IN_FRENCH.test(field)) {
				issues.push(
					`${file}: exercise ${ex.id} — English in French answer/content: "${field.slice(0, 60)}"`
				);
			}
		}
	}

	return issues;
}

function main() {
	const files = packFiles();
	const allIssues: string[] = [];

	for (const file of files) {
		const parsed = unitSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
		if (!parsed.success) {
			allIssues.push(`${file}: invalid unit schema`);
			continue;
		}
		allIssues.push(...checkUnit(parsed.data, file));
	}

	if (allIssues.length > 0) {
		console.error(`Proofread report: ${allIssues.length} flag(s)\n`);
		for (const issue of allIssues) console.error(`  • ${issue}`);
		process.exit(1);
	}

	console.log(`Proofread OK — ${files.length} unit(s), no flags.`);
}

main();
