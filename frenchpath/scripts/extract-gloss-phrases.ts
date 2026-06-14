/** Extract unique englishGloss values for dravido override authoring. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PACKS_DIR = resolve('src/content/packs');
const OUT = resolve('scripts/data/dravido-gloss-overrides.json');

const en = new Set<string>();

for (const file of readdirSync(PACKS_DIR, { recursive: true })
	.map(String)
	.filter((f) => f.endsWith('.json'))) {
	const u = JSON.parse(readFileSync(join(PACKS_DIR, file), 'utf8')) as {
		cards?: { englishGloss?: string; example?: { englishGloss?: string } }[];
	};
	for (const c of u.cards ?? []) {
		if (c.englishGloss?.trim()) en.add(c.englishGloss.trim());
		if (c.example?.englishGloss?.trim()) en.add(c.example.englishGloss.trim());
	}
}

const sorted = [...en].sort();
const template: Record<string, Record<string, string>> = { ta: {}, te: {}, kn: {} };
for (const phrase of sorted) {
	template.ta![phrase] = phrase;
	template.te![phrase] = phrase;
	template.kn![phrase] = phrase;
}

writeFileSync(OUT, JSON.stringify(template, null, 2) + '\n', 'utf8');
console.log(`Wrote ${sorted.length} phrases to ${OUT}`);
