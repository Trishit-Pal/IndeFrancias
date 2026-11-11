// src/lib/pwa/merge.ts
// Pure device-to-device merge of two backup payloads. Strategy per store:
// settings local-wins (milestones unioned); progress LWW on lastVisited with
// field-wise max score/bestCorrect; srsCards LWW on last_review (tie: reps);
// reviewLog union deduped by (cardId,ts,grade); stats per date present on both sides:
// reviewsDone = max(lr, rr, min(lr + remote-only rows, rr + local-only rows)) where lr/rr are the
// sides' own counts (negatives read as 0) and a "-only" row is one whose key the other log lacks,
// bucketed by its local day; xp = max of each side's non-review XP (xp minus XP_PER_REVIEW per its
// reviews) plus XP_PER_REVIEW * reviewsDone; minutes and lessonsCompleted field-wise max. Rows both
// sides hold add nothing, so a self-import or repeated import is a no-op in any time zone. Lesson XP
// from two devices on one day is still a max (it cannot be recomputed), so it can undercount. Reviews
// exchanged for the first time near midnight between devices in different time zones may be counted
// on a neighbouring day once. A date on one side only is copied as is;
// streak joined: later lastActiveDate, current = max(that day plus the consecutive active
// merged-stats days before it, devices' own count on that date, an earlier device's count plus the
// gap when active days connect them), longest = max of all,
// freezes from the later snapshot (equal dates: min available, max used); skillProfile LWW on
// updatedAt; assessments: a passed record (xpAwarded > 0) beats a failed one,
// else LWW on completedAt, lastFailedAt = max of both. Monotonic values use max so a
// merge can never shrink earned progress. summary.replaced counts shared records
// (progress, srsCards, skillProfile, assessments) where the remote record wins.
import type { BackupPayload } from './backupSchema';
import { daysBetween, todayKey } from '../utils/date';
import { XP_PER_REVIEW } from '../srs/constants';

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

	// stats: a date on one side only is kept as is; a shared date follows mergeDayStats
	const localOnlyPerDay = countRowsPerDay(local.reviewLog, remote.reviewLog);
	const remoteOnlyPerDay = countRowsPerDay(remote.reviewLog, local.reviewLog);
	const statsMap = new Map<string, StatsT>(local.stats.map((s) => [s.date, s]));
	for (const r of remote.stats) {
		const l = statsMap.get(r.date);
		statsMap.set(
			r.date,
			l
				? mergeDayStats(l, r, localOnlyPerDay.get(r.date) ?? 0, remoteOnlyPerDay.get(r.date) ?? 0)
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

/** Rows of `log` that `other` does not hold (same key as the dedup), counted per local day key. */
function countRowsPerDay(log: ReviewLogT[], other: ReviewLogT[]): Map<string, number> {
	const otherKeys = new Set(other.map(reviewKey));
	const counts = new Map<string, number>();
	for (const row of log) {
		if (otherKeys.has(reviewKey(row))) continue;
		const day = todayKey(new Date(row.ts));
		counts.set(day, (counts.get(day) ?? 0) + 1);
	}
	return counts;
}

// A hand-edited negative count must not inflate XP.
const reviewCount = (s: StatsT): number => Math.max(0, s.reviewsDone);
const nonReviewXp = (s: StatsT): number => Math.max(0, s.xp - XP_PER_REVIEW * reviewCount(s));

// Only reviews one side lacks are added to the other side's count; rows both sides already hold add
// nothing, so re-merging data both devices have (or importing a device's own file) changes nothing.
// Everything else on the day (lesson and exam XP) cannot be recomputed, so it keeps the larger side.
// XP never drops below the larger side's: that side's own review XP is inside its nonReviewXp split
// and mergedReviews is at least its own count.
function mergeDayStats(
	l: StatsT,
	r: StatsT,
	localOnlyRows: number,
	remoteOnlyRows: number
): StatsT {
	const lr = reviewCount(l);
	const rr = reviewCount(r);
	const reviewsDone = Math.max(lr, rr, Math.min(lr + remoteOnlyRows, rr + localOnlyRows));
	return {
		date: r.date,
		xp: Math.max(nonReviewXp(l), nonReviewXp(r)) + XP_PER_REVIEW * reviewsDone,
		minutes: Math.max(l.minutes, r.minutes),
		lessonsCompleted: Math.max(l.lessonsCompleted, r.lessonsCompleted),
		reviewsDone
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

// lessonsCompleted is deliberately excluded: a replay of an already-aced lesson writes it with no XP
// and no streak credit. Every path that does credit the streak also adds XP or a review.
const isActiveDay = (s: StatsT): boolean => s.xp > 0 || s.reviewsDone > 0;

/**
 * `end` itself counts as active (a streak snapshot proves activity even without a qualifying stats
 * row, e.g. a failed exam), plus the consecutive active stats days immediately before it.
 */
function activeRunEndingOn(end: string, stats: StatsT[]): number {
	const days = stats
		.filter((s) => isActiveDay(s) && s.date < end)
		.map((s) => s.date)
		.sort()
		.reverse();
	let run = 1;
	for (const day of days) {
		if (daysBetween(day, end) !== run) break;
		run++;
	}
	return run;
}

// A streak is the longest of "days recounted from merged stats", the devices' own count on the later
// date, and an earlier device's count joined to it; own counts are kept because a freeze bridge is
// stored only as a counter, not as an active day.
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
	// Two never-active records have no day to count (activeRunEndingOn would credit the empty date).
	const run = lastActiveDate === '' ? 0 : activeRunEndingOn(lastActiveDate, mergedStats);
	// An earlier snapshot joins only when every day strictly between its last day and the merged one
	// is active (gap <= run); its own count then covers whatever its stats cannot (freezes, exams).
	const joined = [local, remote]
		.filter((s) => s.lastActiveDate !== '' && s.lastActiveDate < lastActiveDate)
		.map((s) => {
			const gap = daysBetween(s.lastActiveDate, lastActiveDate);
			return gap <= run ? s.currentStreak + gap : 0;
		});
	const currentStreak = Math.max(run, own, ...joined);
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
