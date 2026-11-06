import type { ReviewMode } from '$lib/gamification/todayPlan';

const MODES: readonly ReviewMode[] = ['read', 'listen', 'type', 'speak'];

/** Parses the `?mode=` query value; anything unknown (or null) is `read`. */
export function parseReviewMode(raw: string | null): ReviewMode {
	return MODES.find((m) => m === raw) ?? 'read';
}
