import type { DifficultyTier } from '$lib/db/schema';

export interface TierConfig {
	questionCount: number;
	passPercent: number;
	xp: number;
	retentionOffset: number;
	maxHints: number;
}

export const TIER_CONFIG: Record<DifficultyTier, TierConfig> = {
	easy: { questionCount: 8, passPercent: 60, xp: 50, retentionOffset: 0.05, maxHints: 2 },
	regular: { questionCount: 12, passPercent: 70, xp: 80, retentionOffset: 0, maxHints: 1 },
	hard: { questionCount: 15, passPercent: 80, xp: 120, retentionOffset: -0.05, maxHints: 0 }
};

export const MILESTONE_XP_BY_TIER: Record<DifficultyTier, number> = {
	easy: 100,
	regular: 120,
	hard: 150
};

export const DELF_XP_BY_TIER: Record<DifficultyTier, number> = {
	easy: 100,
	regular: 150,
	hard: 200
};

export function effectiveRetention(base: number, tier: DifficultyTier): number {
	return Math.min(0.99, Math.max(0.7, base + TIER_CONFIG[tier].retentionOffset));
}

export function scorePercent(correct: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((correct / total) * 100);
}

export function passedCheckpoint(correct: number, total: number, tier: DifficultyTier): boolean {
	return scorePercent(correct, total) >= TIER_CONFIG[tier].passPercent;
}
