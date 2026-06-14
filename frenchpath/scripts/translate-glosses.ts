/**
 * Build-time gloss translation helper.
 * Copies hindiGloss/englishGloss into glosses{} for packs missing full gloss maps.
 *
 *   npx tsx scripts/translate-glosses.ts
 *   npx tsx scripts/translate-glosses.ts --dry-run
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { unitSchema, type Unit, type Card } from '../src/lib/content/schema';

const PACKS_DIR = resolve('src/content/packs');
const dryRun = process.argv.includes('--dry-run');

const NATIVE_LANGS = ['hi', 'bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'en'] as const;

function packFiles(): string[] {
	return readdirSync(PACKS_DIR, { recursive: true })
		.map(String)
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(PACKS_DIR, f));
}

function fillGlosses(card: Card): Card {
	if (card.glosses) return card;
	const hi = card.hindiGloss ?? '';
	const en = card.englishGloss ?? '';
	const glosses = Object.fromEntries(
		NATIVE_LANGS.map((lang) => [lang, lang === 'en' ? en : lang === 'hi' ? hi : hi || en])
	) as Card['glosses'];
	return { ...card, glosses };
}

function processUnit(raw: unknown, file: string): boolean {
	const parsed = unitSchema.safeParse(raw);
	if (!parsed.success) {
		console.error(`Skip invalid unit: ${file}`);
		return false;
	}
	const unit = parsed.data;
	let changed = false;
	const cards = unit.cards.map((c) => {
		const next = fillGlosses(c);
		if (next !== c) changed = true;
		return next;
	});
	if (!changed) return false;
	const out: Unit = { ...unit, cards };
	if (!dryRun) writeFileSync(file, JSON.stringify(out, null, 2) + '\n', 'utf8');
	return true;
}

function main() {
	const files = packFiles();
	let updated = 0;
	for (const file of files) {
		const raw = JSON.parse(readFileSync(file, 'utf8'));
		if (processUnit(raw, file)) updated += 1;
	}
	console.log(
		dryRun
			? `Would update ${updated} pack(s) (dry-run).`
			: `Updated ${updated} pack(s) with glosses{}.`
	);
}

main();
