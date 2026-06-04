/**
 * Validates every committed content pack against the zod schema and regenerates
 * src/content/manifest.json from them. Runs without Vite (plain fs), so it works
 * in CI and pre-commit. Exits non-zero on any problem.
 *
 *   npm run content:validate
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { unitSchema, unitSummarySchema, type Manifest } from '../src/lib/content/schema';

const PACKS_DIR = resolve('src/content/packs');
const MANIFEST_PATH = resolve('src/content/manifest.json');
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];

function packFiles(): string[] {
	return readdirSync(PACKS_DIR, { recursive: true })
		.map(String)
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(PACKS_DIR, f));
}

function main() {
	const files = packFiles();
	const errors: string[] = [];
	const summaries: Manifest = [];

	for (const file of files) {
		const result = unitSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
		if (!result.success) {
			errors.push(
				`${file}\n  ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ')}`
			);
			continue;
		}
		const unit = result.data;

		// Cross-reference: every exercise.cardId must point at a real card.
		const cardIds = new Set(unit.cards.map((c) => c.id));
		for (const ex of unit.exercises) {
			if (ex.cardId && !cardIds.has(ex.cardId)) {
				errors.push(`${file}\n  exercise ${ex.id}: cardId "${ex.cardId}" not found in cards`);
			}
		}

		summaries.push(
			unitSummarySchema.parse({
				id: unit.id,
				cefrLevel: unit.cefrLevel,
				order: unit.order,
				title: unit.title,
				objective: unit.objective
			})
		);
	}

	if (errors.length > 0) {
		console.error(`Content validation FAILED (${errors.length} problem(s)):\n`);
		console.error(errors.join('\n\n'));
		process.exit(1);
	}

	summaries.sort((a, b) =>
		a.cefrLevel === b.cefrLevel
			? a.order - b.order
			: LEVEL_ORDER.indexOf(a.cefrLevel) - LEVEL_ORDER.indexOf(b.cefrLevel)
	);
	writeFileSync(MANIFEST_PATH, JSON.stringify(summaries, null, '\t') + '\n');

	console.log(
		`Validated ${files.length} unit(s). Manifest regenerated with ${summaries.length} entries.`
	);
}

main();
