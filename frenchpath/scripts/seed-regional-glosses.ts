/**
 * Rebuild glosses{} on all packs with script-correct regional copies.
 * Dravidian strings come from scripts/data/dravido-gloss-overrides.json (keyed by englishGloss).
 *
 *   npx tsx scripts/seed-regional-glosses.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { unitSchema, type Unit, type Card } from '../src/lib/content/schema';
import { buildRegionalGlosses, type DravidianOverrides } from './lib/regionalGloss';

const PACKS_DIR = resolve('src/content/packs');
const OVERRIDES_PATH = resolve('scripts/data/dravido-gloss-overrides.json');

function loadOverrides(): DravidianOverrides {
	try {
		return JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8')) as DravidianOverrides;
	} catch {
		return {};
	}
}

function packFiles(): string[] {
	return readdirSync(PACKS_DIR, { recursive: true })
		.map(String)
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(PACKS_DIR, f));
}

function glossCard(card: Card, overrides: DravidianOverrides): Card {
	const hi = card.hindiGloss ?? card.glosses?.hi ?? '';
	const en = card.englishGloss ?? card.glosses?.en ?? hi;
	if (!hi || !en) return card;
	const glosses = buildRegionalGlosses(hi, en, overrides) as Card['glosses'];
	const next: Card = { ...card, glosses };
	if (card.example) {
		const eHi = card.example.hindiGloss ?? card.example.glosses?.hi ?? hi;
		const eEn = card.example.englishGloss ?? card.example.glosses?.en ?? en;
		next.example = {
			...card.example,
			glosses: buildRegionalGlosses(eHi, eEn, overrides) as Card['glosses']
		};
	}
	return next;
}

function main() {
	const overrides = loadOverrides();
	let updated = 0;
	for (const file of packFiles()) {
		const raw = JSON.parse(readFileSync(file, 'utf8'));
		const parsed = unitSchema.safeParse(raw);
		if (!parsed.success) {
			console.error('Skip invalid:', file);
			continue;
		}
		const cards = parsed.data.cards.map((c) => glossCard(c, overrides));
		const out: Unit = { ...parsed.data, cards };
		writeFileSync(file, JSON.stringify(out, null, '\t') + '\n', 'utf8');
		updated += 1;
	}
	console.log(`Seeded regional glosses on ${updated} pack(s).`);
}

main();
