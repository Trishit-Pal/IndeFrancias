import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	applyGlossDraftSet,
	applyGlossDrafts,
	listGlossItems
} from '../../../scripts/lib/glossDrafts';
import { LANGUAGES } from '../i18n/languages';
import { unitSchema } from './schema';

const DRAFT_ONLY = ['ml', 'or', 'as'] as const;

describe('applyGlossDraftSet — glosses for newly curated cards', () => {
	// A real pack whose gloss maps lack ml/or/as, as after curation adds cards.
	const pack = JSON.parse(
		readFileSync(resolve(process.cwd(), 'src/content/packs/a1/unit-01.json'), 'utf8')
	);
	const drafts = Object.fromEntries(DRAFT_ONLY.map((lang) => [lang, {} as Record<string, string>]));
	const stripped = structuredClone(pack);
	for (const card of stripped.cards) {
		for (const [key, holder] of [
			[`${pack.id}/${card.id}`, card],
			[`${pack.id}/${card.id}/example`, card.example]
		]) {
			if (!holder?.glosses) continue;
			for (const lang of DRAFT_ONLY) {
				drafts[lang]![key] = holder.glosses[lang];
				delete holder.glosses[lang];
			}
		}
	}
	const sets = DRAFT_ONLY.map((lang) => ({
		lang,
		drafts: drafts[lang]!,
		script: LANGUAGES[lang].script
	}));

	it('one language alone cannot make the unit valid (the schema needs all three)', () => {
		const one = applyGlossDrafts(stripped, 'ml', drafts.ml!, LANGUAGES.ml.script);
		expect(unitSchema.safeParse(one.unit).success).toBe(false);
	});

	it('applying all three languages in one pass gives a valid unit equal to the original', () => {
		const result = applyGlossDraftSet(stripped, sets);
		expect(result.problems).toEqual([]);
		expect(unitSchema.safeParse(result.unit).success).toBe(true);
		expect(result.unit).toEqual(pack);
	});
});
import {
	DERIVED_GLOSS_LANGS,
	buildRegionalGlosses,
	containsIndicScript,
	isDerivedGlossLang
} from '../../../scripts/lib/regionalGloss';

const ML = /[\u0D00-\u0D7F]/;

function makeUnit(): Record<string, unknown> {
	return {
		id: 'u1',
		cards: [
			{
				id: 'c1',
				french: 'bonjour',
				hindiGloss: 'old-hi',
				englishGloss: 'old-en',
				glosses: { hi: 'नमस्ते', en: 'hello' },
				example: {
					french: 'Bonjour !',
					englishGloss: 'Hello!',
					hindiGloss: 'नमस्ते!',
					glosses: { bn: 'x', hi: 'नमस्ते!', en: 'Hello!' }
				}
			},
			{ id: 'c2', french: 'merci', hindiGloss: 'धन्यवाद', englishGloss: 'thanks' }
		],
		exercises: []
	};
}

describe('listGlossItems', () => {
	it('lists card then example, skipping nothing, with reference text', () => {
		const items = listGlossItems(makeUnit());
		expect(items.map((i) => i.key)).toEqual(['u1/c1', 'u1/c1/example', 'u1/c2']);
		expect(items[0]).toEqual({ key: 'u1/c1', fr: 'bonjour', en: 'hello', hi: 'नमस्ते' });
		expect(items[1]).toEqual({
			key: 'u1/c1/example',
			fr: 'Bonjour !',
			en: 'Hello!',
			hi: 'नमस्ते!'
		});
	});

	it('falls back to the legacy fields when a map lacks en/hi', () => {
		const unit = makeUnit();
		(unit.cards as Record<string, unknown>[])[0].glosses = { bn: 'y' };
		const [first] = listGlossItems(unit);
		expect(first.en).toBe('old-en');
		expect(first.hi).toBe('old-hi');
		expect(listGlossItems(unit)[2]).toEqual({
			key: 'u1/c2',
			fr: 'merci',
			en: 'thanks',
			hi: 'धन्यवाद'
		});
	});
});

describe('applyGlossDrafts', () => {
	const drafts = { 'u1/c1': 'ഹലോ', 'u1/c1/example': 'ഹലോ!' };

	it('adds the key last, keeps the rest, does not mutate, counts', () => {
		const unit = makeUnit();
		const before = structuredClone(unit);
		const r = applyGlossDrafts(unit, 'ml', drafts, ML);
		expect(unit).toEqual(before);
		expect(r.problems).toEqual([]);
		expect(r.applied).toBe(2);
		const cards = (r.unit as { cards: { glosses?: object; example?: { glosses: object } }[] })
			.cards;
		expect(Object.keys(cards[0].glosses!)).toEqual(['hi', 'en', 'ml']);
		expect(Object.keys(cards[0].example!.glosses)).toEqual(['bn', 'hi', 'en', 'ml']);
		expect(cards[1]).toEqual((before.cards as unknown[])[1]);
	});

	it('overwrites on re-apply without a second key', () => {
		const once = applyGlossDrafts(makeUnit(), 'ml', drafts, ML).unit;
		const twice = applyGlossDrafts(once, 'ml', { ...drafts, 'u1/c1': 'ഹായ്' }, ML);
		const g = (twice.unit as { cards: { glosses: Record<string, string> }[] }).cards[0].glosses;
		expect(g.ml).toBe('ഹായ്');
		expect(Object.keys(g)).toEqual(['hi', 'en', 'ml']);
	});

	it('reports missing and whitespace-only drafts', () => {
		const r = applyGlossDrafts(makeUnit(), 'ml', { 'u1/c1': '  ' }, ML);
		expect(r.problems).toEqual(['missing draft: u1/c1', 'missing draft: u1/c1/example']);
		expect(r.applied).toBe(0);
	});

	it('reports a draft in the wrong script', () => {
		const r = applyGlossDrafts(makeUnit(), 'ml', { ...drafts, 'u1/c1': 'hello' }, ML);
		expect(r.problems).toEqual(['wrong script: u1/c1 — "hello"']);
		expect(r.applied).toBe(1);
	});

	it('leaves a card without glosses alone, without a problem', () => {
		const r = applyGlossDrafts(makeUnit(), 'ml', drafts, ML);
		expect(r.problems).toEqual([]);
		expect((r.unit as { cards: unknown[] }).cards[1]).toEqual({
			id: 'c2',
			french: 'merci',
			hindiGloss: 'धन्यवाद',
			englishGloss: 'thanks'
		});
	});

	it('adds no default fields', () => {
		const r = applyGlossDrafts(makeUnit(), 'ml', drafts, ML);
		expect(Object.keys(r.unit as object)).toEqual(Object.keys(makeUnit()));
		const c = (r.unit as { cards: object[] }).cards[0];
		expect(Object.keys(c)).toEqual(Object.keys((makeUnit().cards as object[])[0]));
	});
});

describe('containsIndicScript', () => {
	const samples: Record<string, string> = {
		Devanagari: 'नमस्ते',
		Bengali: 'নমস্কার',
		Gurmukhi: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
		Gujarati: 'નમસ્તે',
		Tamil: 'வணக்கம்',
		Telugu: 'నమస్కారం',
		Kannada: 'ನಮಸ್ಕಾರ',
		Malayalam: 'നമസ്കാരം',
		Odia: 'ନମସ୍କାର'
	};
	it.each(Object.entries(samples))('detects %s', (_name, text) => {
		expect(containsIndicScript(text)).toBe(true);
	});
	it('ignores accented French', () => {
		expect(containsIndicScript('Ça coûte déjà 20 € — où ?')).toBe(false);
	});
});

describe('buildRegionalGlosses', () => {
	it('derives exactly the nine Hindi/English-derived languages, never ml, or, as', () => {
		const built = buildRegionalGlosses('नमस्ते', 'hello');
		expect(Object.keys(built).sort()).toEqual([...DERIVED_GLOSS_LANGS].sort());
		expect(DERIVED_GLOSS_LANGS).toHaveLength(9);
	});

	it('merged over an existing gloss map keeps its ml value', () => {
		const merged = { ...{ ml: 'നമസ്കാരം', hi: 'old' }, ...buildRegionalGlosses('नमस्ते', 'hello') };
		expect(merged.ml).toBe('നമസ്കാരം');
		expect(merged.hi).toBe('नमस्ते');
	});
});

describe('isDerivedGlossLang', () => {
	it('is true for derived languages and false for draft-only ones', () => {
		expect(isDerivedGlossLang('en')).toBe(true);
		expect(isDerivedGlossLang('hi')).toBe(true);
		expect(isDerivedGlossLang('ml')).toBe(false);
		expect(isDerivedGlossLang('hinglish')).toBe(false);
	});
});
