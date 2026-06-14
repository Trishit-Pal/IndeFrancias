/**
 * Backfills glosses{} on all unit packs from legacy hindiGloss/englishGloss.
 * Run: npx tsx scripts/migrate-glosses.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const NATIVE_LANGS = ['hi', 'bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'en'] as const;
const PACKS_DIR = join(import.meta.dirname, '../src/content/packs');

type Card = {
	hindiGloss?: string;
	englishGloss?: string;
	glosses?: Record<string, string>;
	example?: { hindiGloss?: string; englishGloss?: string; glosses?: Record<string, string> };
	[key: string]: unknown;
};

function buildGlosses(hi: string, en: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const lang of NATIVE_LANGS) {
		if (lang === 'hi') out[lang] = hi;
		else if (lang === 'en') out[lang] = en;
		else if (lang === 'bn' || lang === 'mr' || lang === 'gu') out[lang] = hi;
		else out[lang] = en;
	}
	return out;
}

function migrateCard(card: Card): Card {
	const hi = card.hindiGloss ?? card.glosses?.hi ?? '';
	const en = card.englishGloss ?? card.glosses?.en ?? hi;
	if (!hi || !en) return card;
	const next: Card = {
		...card,
		glosses: buildGlosses(hi, en)
	};
	if (card.example) {
		const eHi = card.example.hindiGloss ?? hi;
		const eEn = card.example.englishGloss ?? en;
		next.example = {
			...card.example,
			glosses: buildGlosses(eHi, eEn)
		};
	}
	return next;
}

function migrateUnit(path: string): void {
	const raw = JSON.parse(readFileSync(path, 'utf8')) as { cards?: Card[] };
	if (!raw.cards?.length) return;
	raw.cards = raw.cards.map(migrateCard);
	writeFileSync(path, JSON.stringify(raw, null, '\t') + '\n', 'utf8');
	console.log('migrated', path);
}

for (const level of readdirSync(PACKS_DIR)) {
	const dir = join(PACKS_DIR, level);
	for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
		migrateUnit(join(dir, file));
	}
}
