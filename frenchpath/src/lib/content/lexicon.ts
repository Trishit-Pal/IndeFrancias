import type { NativeLanguage } from '$lib/db/schema';
import type { Card } from './schema';
import { getGloss, type GlossResult } from './gloss';

export interface LexiconEntry {
	cardId: string;
	french: string;
	gender: Card['gender'];
	ipa?: string;
	gloss: GlossResult;
}

export type Lexicon = Map<string, LexiconEntry>;

/** Strip accents for fuzzy lookup. */
export function normalizeFrenchToken(raw: string): string {
	return raw
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/^[''`](.+)/, '$1')
		.replace(/[^\p{L}\p{N}'-]/gu, '')
		.trim();
}

const CONTRACTION_PREFIXES = ["l'", "d'", "j'", "m'", "t'", "s'", "n'", "c'", "qu'"];

/** Expand l'homme → homme for lookup. */
export function stripContraction(token: string): string {
	const lower = token.toLowerCase();
	for (const prefix of CONTRACTION_PREFIXES) {
		if (lower.startsWith(prefix)) return lower.slice(prefix.length);
	}
	return lower;
}

function registerForm(lexicon: Lexicon, form: string, entry: LexiconEntry): void {
	const norm = normalizeFrenchToken(stripContraction(form));
	if (norm.length > 0 && !lexicon.has(norm)) {
		lexicon.set(norm, entry);
	}
}

/** Build lookup map from vocabulary cards. */
export function buildLexicon(cards: Card[], nativeLanguage: NativeLanguage): Lexicon {
	const lexicon: Lexicon = new Map();

	for (const card of cards) {
		const entry: LexiconEntry = {
			cardId: card.id,
			french: card.french,
			gender: card.gender,
			ipa: card.ipa,
			gloss: getGloss(card, nativeLanguage)
		};

		registerForm(lexicon, card.french, entry);

		if (card.forms?.length) {
			for (const form of card.forms) {
				registerForm(lexicon, form, entry);
			}
		}
	}

	return lexicon;
}

export function lookupLexicon(lexicon: Lexicon, rawToken: string): LexiconEntry | null {
	const stripped = stripContraction(rawToken);
	const norm = normalizeFrenchToken(stripped);
	return lexicon.get(norm) ?? null;
}

/** Split French text into tokens preserving punctuation as separate segments. */
export function tokenizeFrench(
	text: string
): { type: 'word' | 'space' | 'punct'; value: string }[] {
	const parts = text.match(/\s+|[^\s\p{L}\p{N}'-]+|[\p{L}\p{N}'-]+/gu) ?? [text];
	return parts.map((value) => {
		if (/^\s+$/.test(value)) return { type: 'space' as const, value };
		if (/^[\p{L}\p{N}'-]+$/u.test(value)) return { type: 'word' as const, value };
		return { type: 'punct' as const, value };
	});
}
