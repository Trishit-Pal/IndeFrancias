import type { Caps, ReviewMode } from '$lib/gamification/todayPlan';

const MODES: readonly ReviewMode[] = ['read', 'listen', 'type', 'speak'];

/** Parses the `?mode=` query value; anything unknown (or null) is `read`. */
export function parseReviewMode(raw: string | null): ReviewMode {
	return MODES.find((m) => m === raw) ?? 'read';
}

export const MATURE_STABILITY_DAYS = 21;

/** Decides how a card is shown; fixed per card at load time. */
export function presentationFor(
	card: { stability: number },
	mode: ReviewMode,
	hasPrompt: boolean,
	caps: Caps,
	isSpeakingCard: boolean
): ReviewMode | 'flip' {
	const mature = card.stability >= MATURE_STABILITY_DAYS;
	if (!hasPrompt) return mature ? 'type' : 'flip';
	if (mature && (mode === 'read' || mode === 'listen'))
		return isSpeakingCard && caps.asr ? 'speak' : 'type';
	if (mode === 'listen' && !caps.tts) return 'read';
	return mode;
}
