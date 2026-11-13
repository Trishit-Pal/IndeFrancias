import type { NativeLanguage } from '$lib/db/schema';
import { glossFallback } from '$lib/i18n/languages';
import type { BridgeBox, Card } from './schema';

export type GlossSource = Pick<Card, 'hindiGloss' | 'englishGloss' | 'glosses'>;

export interface GlossResult {
	primary: string;
	secondary?: string;
}

function glossFromMap(
	glosses: Partial<Record<NativeLanguage, string>>,
	lang: NativeLanguage
): string | undefined {
	const direct = glosses[lang];
	if (direct?.trim()) return direct;
	for (const fb of glossFallback(lang)) {
		const v = glosses[fb];
		if (v?.trim()) return v;
	}
	return undefined;
}

/** Resolves display gloss for a card from learner native language preference. */
export function getGloss(card: GlossSource, nativeLanguage: NativeLanguage): GlossResult {
	if (card.glosses) {
		const primary = glossFromMap(card.glosses, nativeLanguage);
		const secondary =
			nativeLanguage !== 'en' ? glossFromMap(card.glosses, 'en') : glossFromMap(card.glosses, 'hi');
		if (primary) {
			return {
				primary,
				secondary: secondary && secondary !== primary ? secondary : undefined
			};
		}
	}

	if (nativeLanguage === 'hi' && card.hindiGloss) {
		return {
			primary: card.hindiGloss,
			secondary: card.englishGloss !== card.hindiGloss ? card.englishGloss : undefined
		};
	}

	return {
		primary: card.englishGloss ?? card.hindiGloss ?? '',
		secondary:
			card.hindiGloss && card.hindiGloss !== card.englishGloss ? card.hindiGloss : undefined
	};
}

/** Resolves bridge title/body for learner native language. */
export function getBridgeCopy(
	bridge: BridgeBox,
	nativeLanguage: NativeLanguage
): { title: string; body: string } {
	const order = [nativeLanguage, ...glossFallback(nativeLanguage)];
	const pick = (
		byLang: Partial<Record<NativeLanguage, string>> | undefined,
		plain: string
	): string => {
		for (const lang of order) {
			const text = byLang?.[lang]?.trim();
			if (text) return text;
		}
		return plain;
	};
	return {
		title: pick(bridge.titleByLang, bridge.title),
		body: pick(bridge.bodyByLang, bridge.body)
	};
}
