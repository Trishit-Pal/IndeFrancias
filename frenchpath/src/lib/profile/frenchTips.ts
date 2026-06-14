export const FRENCH_TIPS = [
	'French nouns have gender (le/la) — learn them with the article, not alone.',
	'Silent letters are common: "bonjour" sounds like bon-zhoor.',
	'Indian learners: French "r" is uvular — softer than Hindi र.',
	'Use spaced repetition daily — short sessions beat long cramming.',
	'Listen before you read — TTS helps train your ear offline.'
] as const;

export function tipForUnit(unitOrder: number): string {
	return FRENCH_TIPS[unitOrder % FRENCH_TIPS.length]!;
}
