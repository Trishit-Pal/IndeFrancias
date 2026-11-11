// src/lib/pwa/merge.ts
// Pure device-to-device merge of two backup payloads. Strategy per store:
// settings local-wins (milestones unioned); progress LWW on lastVisited with
// field-wise max score/bestCorrect; srsCards LWW on last_review (tie: reps);
// reviewLog union deduped by (cardId,ts,grade); stats field-wise max per date;
// streak joined: later lastActiveDate, current = max(consecutive active merged-stats
// days ending there, devices' own count on that date), longest = max of all,
// freezes from the later snapshot (equal dates: min available, max used); skillProfile LWW on
// updatedAt; assessments: a passed record (xpAwarded > 0) beats a failed one,
// else LWW on completedAt, lastFailedAt = max of both. Monotonic values use max so a
// merge can never shrink earned progress. summary.replaced counts shared records
// (progress, srsCards, skillProfile, assessments) where the remote record wins.
import type { BackupPayload } from './backupSchema';
import { daysBetween } from '../utils/date';

export interface MergeSummary {
	newReviews: number;
	newProgress: number;
	newCards: number;
	newAssessments: number;
	/** Records on both sides where the remote one wins (progress, cards, skills, assessments). */
	replaced: number;
}
export interface MergeResult {
	merged: BackupPayload;
	summary: MergeSummary;
}

type Progress = BackupPayload['progress'][number];
type SrsCardT = BackupPayload['srsCards'][number];
type ReviewLogT = BackupPayload['reviewLog'][number];
type StreakT = BackupPayload['streak'][number];
type StatsT = BackupPayload['stats'][number];
type SkillProfileT = BackupPayload['skillProfile'][number];
type AssessmentT = BackupPayload['assessments'][number];
type SettingsT = NonNullable<BackupPayload['settings']>;

const reviewKey = (r: { cardId: string; ts: number; grade: number }) =>
	`${r.cardId}|${r.ts}|${r.grade}`;

const lastReviewEpoch = (c: { last_review?: string }): number =>
	c.last_review ? new Date(c.last_review).getTime() : 0;

export function mergePayloads(local: BackupPayload, remote: BackupPayload): MergeResult {
	let replaced = 0;
	// progress: per lessonId, higher lastVisited wins; score/bestCorrect take field-wise max
	const progressMap = new Map<string, Progress>(local.progress.map((p) => [p.lessonId, p]));
	let newProgress = 0;
	for (const r of remote.progress) {
		const l = progressMap.get(r.lessonId);
		if (!l) {
			progressMap.set(r.lessonId, r);
			newProgress++;
		} else {
			const winner = r.lastVisited > l.lastVisited ? r : l;
			if (winner === r) replaced++;
			progressMap.set(r.lessonId, {
				...winner,
				score: Math.max(l.score, r.score),
				bestCorrect: Math.max(l.bestCorrect ?? 0, r.bestCorrect ?? 0) || undefined
			});
		}
	}

	// srsCards: per cardId, later last_review wins (missing = epoch 0); tie -> more reps
	const cardsMap = new Map<string, SrsCardT>(local.srsCards.map((c) => [c.cardId, c]));
	let newCards = 0;
	for (const r of remote.srsCards) {
		const l = cardsMap.get(r.cardId);
		if (!l) {
			cardsMap.set(r.cardId, r);
			newCards++;
			continue;
		}
		const lEpoch = lastReviewEpoch(l);
		const rEpoch = lastReviewEpoch(r);
		const winner = rEpoch !== lEpoch ? (rEpoch > lEpoch ? r : l) : r.reps > l.reps ? r : l;
		if (winner === r) replaced++;
		cardsMap.set(r.cardId, winner);
	}

	// reviewLog: union, deduped by (cardId, ts, grade); strip autoIncrement id from every record
	const reviewSeen = new Set(local.reviewLog.map(reviewKey));
	let newReviews = 0;
	const newRemoteReviews = remote.reviewLog.filter((r) => {
		if (reviewSeen.has(reviewKey(r))) return false;
		newReviews++;
		return true;
	});
	const mergedReviews: ReviewLogT[] = [...local.reviewLog, ...newRemoteReviews].map((r) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping `id`, autoIncrement reassigns it
		const { id, ...rest } = r;
		return rest;
	});

	// stats: per date, every field takes field-wise max (never summed — avoids double-counting)
	const statsMap = new Map<string, StatsT>(local.stats.map((s) => [s.date, s]));
	for (const r of remote.stats) {
		const l = statsMap.get(r.date);
		statsMap.set(
			r.date,
			l
				? {
						date: r.date,
						xp: Math.max(l.xp, r.xp),
						minutes: Math.max(l.minutes, r.minutes),
						lessonsCompleted: Math.max(l.lessonsCompleted, r.lessonsCompleted),
						reviewsDone: Math.max(l.reviewsDone, r.reviewsDone)
					}
				: r
		);
	}

	// streak: joined using the merged stats, so it must come after them
	const mergedStreak = mergeStreak(local.streak[0], remote.streak[0], [...statsMap.values()]);

	// skillProfile: per skill, higher updatedAt wins the whole record
	const skillMap = new Map<string, SkillProfileT>(local.skillProfile.map((s) => [s.skill, s]));
	for (const r of remote.skillProfile) {
		const l = skillMap.get(r.skill);
		const remoteWins = !l || r.updatedAt > l.updatedAt;
		if (l && remoteWins) replaced++;
		skillMap.set(r.skill, remoteWins ? r : l);
	}

	// assessments: per assessmentId, a passed record beats a failed one; else later completedAt wins
	const assessmentsMap = new Map<string, AssessmentT>(
		local.assessments.map((a) => [a.assessmentId, a])
	);
	let newAssessments = 0;
	for (const r of remote.assessments) {
		const l = assessmentsMap.get(r.assessmentId);
		if (!l) {
			assessmentsMap.set(r.assessmentId, r);
			newAssessments++;
		} else {
			if (assessmentWinner(l, r) === r) replaced++;
			assessmentsMap.set(r.assessmentId, mergeAssessment(l, r));
		}
	}

	// settings: local wins entirely; only celebratedMilestones unions across devices
	const mergedSettings = mergeSettings(local.settings, remote.settings);

	const merged: BackupPayload = {
		settings: mergedSettings,
		progress: [...progressMap.values()],
		srsCards: [...cardsMap.values()],
		reviewLog: mergedReviews,
		streak: mergedStreak ? [mergedStreak] : [],
		stats: [...statsMap.values()],
		skillProfile: [...skillMap.values()],
		assessments: [...assessmentsMap.values()]
	};

	return {
		merged,
		summary: { newReviews, newProgress, newCards, newAssessments, replaced }
	};
}

const hasPassed = (a: AssessmentT): boolean => a.xpAwarded > 0;

function assessmentWinner(local: AssessmentT, remote: AssessmentT): AssessmentT {
	if (hasPassed(local) !== hasPassed(remote)) return hasPassed(remote) ? remote : local;
	return remote.completedAt > local.completedAt ? remote : local;
}

function mergeAssessment(local: AssessmentT, remote: AssessmentT): AssessmentT {
	const winner = assessmentWinner(local, remote);
	const failedTimes = [local.lastFailedAt, remote.lastFailedAt].filter(
		(t): t is number => t !== undefined
	);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- re-added below only when defined
	const { lastFailedAt, ...rest } = winner;
	return failedTimes.length > 0 ? { ...rest, lastFailedAt: Math.max(...failedTimes) } : rest;
}

const isActiveDay = (s: StatsT): boolean => s.xp > 0 || s.lessonsCompleted > 0 || s.reviewsDone > 0;

/** Consecutive active days ending on `end` (0 when `end` itself is not active). */
function activeRunEndingOn(end: string, stats: StatsT[]): number {
	const days = stats
		.filter((s) => isActiveDay(s) && s.date <= end)
		.map((s) => s.date)
		.sort()
		.reverse();
	let run = 0;
	for (const day of days) {
		if (daysBetween(day, end) !== run) break;
		run++;
	}
	return run;
}

// A streak is the longer of "days recounted from merged stats" and the device's own count; the own
// count is kept because a freeze bridge is stored only as a counter, not as an active day.
function mergeStreak(
	local: StreakT | undefined,
	remote: StreakT | undefined,
	mergedStats: StatsT[]
): StreakT | undefined {
	if (!local) return remote;
	if (!remote) return local;
	const lastActiveDate =
		local.lastActiveDate > remote.lastActiveDate ? local.lastActiveDate : remote.lastActiveDate;
	const current = [local, remote].filter((s) => s.lastActiveDate === lastActiveDate);
	const own = Math.max(...current.map((s) => s.currentStreak));
	const currentStreak = Math.max(activeRunEndingOn(lastActiveDate, mergedStats), own);
	return {
		id: 'streak',
		currentStreak,
		longestStreak: Math.max(local.longestStreak, remote.longestStreak, currentStreak),
		lastActiveDate,
		freezesAvailable: Math.min(...current.map((s) => s.freezesAvailable)),
		freezesUsed: Math.max(...current.map((s) => s.freezesUsed))
	};
}

function mergeSettings(local: SettingsT | null, remote: SettingsT | null): SettingsT | null {
	if (!local) return remote;
	if (!remote) return local;
	const milestones = new Set([
		...(local.celebratedMilestones ?? []),
		...(remote.celebratedMilestones ?? [])
	]);
	return { ...local, celebratedMilestones: [...milestones] };
}
