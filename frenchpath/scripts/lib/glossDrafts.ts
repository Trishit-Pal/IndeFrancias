/**
 * Pure helpers to list the gloss worklist of a unit and merge translator drafts into it.
 * Works on RAW parsed pack JSON (never on schema output, which adds default fields).
 */

/** One gloss map in a pack: a card's, or its example's. */
export interface GlossWorkItem {
	/** `<unitId>/<cardId>` for a card, `<unitId>/<cardId>/example` for its example sentence. */
	key: string;
	/** The French word or sentence being glossed. */
	fr: string;
	/** The English gloss (the meaning to translate). */
	en: string;
	/** The Hindi gloss, as a second reference. */
	hi: string;
}

type Raw = Record<string, unknown>;

const isRecord = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Every gloss-bearing holder (card or example) of a unit, in card order. */
function holders(unit: unknown): { key: string; holder: Raw }[] {
	if (!isRecord(unit) || !Array.isArray(unit.cards)) return [];
	const out: { key: string; holder: Raw }[] = [];
	for (const card of unit.cards) {
		if (!isRecord(card)) continue;
		const key = `${str(unit.id)}/${str(card.id)}`;
		out.push({ key, holder: card });
		if (isRecord(card.example)) out.push({ key: `${key}/example`, holder: card.example });
	}
	return out;
}

/** Every gloss map of a unit, in card order (card, then its example). */
export function listGlossItems(unit: unknown): GlossWorkItem[] {
	return holders(unit).map(({ key, holder }) => {
		const g = isRecord(holder.glosses) ? holder.glosses : {};
		return {
			key,
			fr: str(holder.french),
			en: str(g.en) || str(holder.englishGloss),
			hi: str(g.hi) || str(holder.hindiGloss)
		};
	});
}

/** Returns a copy of `unit` with `glosses[lang]` set from `drafts` on every gloss map.
 *  Never mutates `unit`. Collects problems instead of throwing. */
export function applyGlossDrafts(
	unit: unknown,
	lang: string,
	drafts: Readonly<Record<string, string>>,
	script: RegExp
): { unit: unknown; applied: number; problems: string[] } {
	const copy: unknown = structuredClone(unit);
	const problems: string[] = [];
	let applied = 0;
	for (const { key, holder } of holders(copy)) {
		if (!isRecord(holder.glosses)) continue;
		const draft = drafts[key];
		if (typeof draft !== 'string' || !draft.trim()) {
			problems.push(`missing draft: ${key}`);
			continue;
		}
		if (!script.test(draft)) {
			problems.push(`wrong script: ${key} — "${draft.slice(0, 40)}"`);
			continue;
		}
		holder.glosses[lang] = draft;
		applied++;
	}
	return { unit: copy, applied, problems };
}
