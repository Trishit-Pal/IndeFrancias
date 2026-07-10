// src/lib/pwa/merge.ts
// Pure device-to-device merge of two backup payloads. Strategy per store:
// settings local-wins (milestones unioned); progress LWW on lastVisited with
// field-wise max score/bestCorrect; srsCards LWW on last_review (tie: reps);
// reviewLog union deduped by (cardId,ts,grade); streak longest=max, rest from
// later lastActiveDate; stats field-wise max per date; skillProfile LWW on
// updatedAt; assessments LWW on completedAt. Monotonic values use max so a
// merge can never shrink earned progress.
import type { BackupPayload } from './backupSchema';

export interface MergeSummary {
	newReviews: number;
	newProgress: number;
	newCards: number;
	newAssessments: number;
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
	const mergedReviews: ReviewLogT[] = [...local.reviewLog, ...newRemoteReviews].map(
		({ id: _id, ...rest }) => rest
	);

	// streak: longestStreak = max of both; rest of the fields come from the later-lastActiveDate snapshot
	const mergedStreak = mergeStreak(local.streak[0], remote.streak[0]);

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

	// skillProfile: per skill, higher updatedAt wins the whole record
	const skillMap = new Map<string, SkillProfileT>(local.skillProfile.map((s) => [s.skill, s]));
	for (const r of remote.skillProfile) {
		const l = skillMap.get(r.skill);
		skillMap.set(r.skill, !l || r.updatedAt > l.updatedAt ? r : l);
	}

	// assessments: per assessmentId, later completedAt wins the whole record
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
			assessmentsMap.set(r.assessmentId, r.completedAt > l.completedAt ? r : l);
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
		summary: { newReviews, newProgress, newCards, newAssessments }
	};
}

function mergeStreak(local: StreakT | undefined, remote: StreakT | undefined): StreakT | undefined {
	if (!local) return remote;
	if (!remote) return local;
	const snapshot = remote.lastActiveDate > local.lastActiveDate ? remote : local;
	return { ...snapshot, longestStreak: Math.max(local.longestStreak, remote.longestStreak) };
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
