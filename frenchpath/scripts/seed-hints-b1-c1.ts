/**
 * Adds hint + coachNote to B1–C1 exercises missing them.
 * Run: npx tsx scripts/seed-hints-b1-c1.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PACKS = join(import.meta.dirname, '../src/content/packs');

for (const level of ['b1', 'b2', 'c1']) {
	const dir = join(PACKS, level);
	for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
		const path = join(dir, file);
		const unit = JSON.parse(readFileSync(path, 'utf8')) as {
			exercises: Record<string, unknown>[];
			objective: string;
			title: string;
		};
		let changed = false;
		for (const ex of unit.exercises) {
			if (!ex.hint) {
				ex.hint = `Focus on the grammar and vocabulary from « ${unit.title} ».`;
				changed = true;
			}
			if (!ex.coachNote) {
				ex.coachNote = unit.objective.slice(0, 120);
				changed = true;
			}
		}
		if (changed) {
			writeFileSync(path, JSON.stringify(unit, null, 2) + '\n');
			console.log('Updated hints:', path);
		}
	}
}
