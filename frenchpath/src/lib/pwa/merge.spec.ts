// src/lib/pwa/merge.spec.ts
import { describe, it, expect } from 'vitest';
import { mergePayloads } from './merge';
import type { BackupPayload } from './backupSchema';

const payload = (over: Partial<BackupPayload> = {}): BackupPayload => ({
	settings: null,
	progress: [],
	srsCards: [],
	reviewLog: [],
	streak: [],
	stats: [],
	skillProfile: [],
	assessments: [],
	...over
});

const prog = (lessonId: string, lastVisited: number, score = 80) => ({
	lessonId,
	status: 'completed' as const,
	score,
	attempts: 1,
	lastVisited,
	cefrLevel: 'A1' as const
});

const card = (cardId: string, last_review?: string, reps = 0) => ({
	cardId,
	contentId: 'content-1',
	cefrLevel: 'A1' as const,
	skill: 'reading' as const,
	due: '2026-01-01T00:00:00.000Z',
	stability: 1,
	difficulty: 1,
	elapsed_days: 0,
	scheduled_days: 0,
	learning_steps: 0,
	reps,
	lapses: 0,
	state: 2,
	last_review,
	schedulerVersion: '6'
});

const review = (id: number | undefined, cardId: string, ts: number, grade: number) => ({
	id,
	cardId,
	ts,
	grade,
	state: 2,
	stability: 1,
	difficulty: 1,
	elapsedDays: 0,
	scheduledDays: 0
});

const streakRec = (
	currentStreak: number,
	longestStreak: number,
	lastActiveDate: string,
	freezesAvailable = 0,
	freezesUsed = 0
) => ({
	id: 'streak' as const,
	currentStreak,
	longestStreak,
	lastActiveDate,
	freezesAvailable,
	freezesUsed
});

const stat = (
	date: string,
	xp: number,
	minutes: number,
	lessonsCompleted: number,
	reviewsDone: number
) => ({ date, xp, minutes, lessonsCompleted, reviewsDone });

const skillRec = (
	skill: 'listening' | 'reading' | 'spokenInteraction' | 'spokenProduction' | 'writing',
	estimatedLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1',
	updatedAt: number
) => ({ skill, estimatedLevel, updatedAt });

const assessment = (assessmentId: string, completedAt: number, score = 90) => ({
	assessmentId,
	kind: 'unit_checkpoint' as const,
	refId: 'u1',
	score,
	xpAwarded: 10,
	completedAt
});

const settings = (over: Partial<NonNullable<BackupPayload['settings']>> = {}) => ({
	uiLanguage: 'en' as const,
	targetRetention: 0.9,
	dailyGoalXp: 50,
	ttsVoice: null,
	audioSpeed: 1,
	theme: 'light' as const,
	reduceMotion: false,
	persistGranted: false,
	onboarded: true,
	celebratedMilestones: [] as number[],
	...over
});

describe('mergePayloads', () => {
	it('newer remote progress wins per lesson; summary counts it', () => {
		const local = payload({ progress: [prog('u1', 100, 60)] });
		const remote = payload({ progress: [prog('u1', 200, 90), prog('u2', 50)] });
		const { merged, summary } = mergePayloads(local, remote);
		expect(merged.progress).toHaveLength(2);
		expect(merged.progress.find((p) => p.lessonId === 'u1')?.lastVisited).toBe(200);
		expect(merged.progress.find((p) => p.lessonId === 'u1')?.score).toBe(90);
		expect(summary.newProgress).toBe(1); // only u2 is new-to-local
		expect(local.progress[0].score).toBe(60); // inputs untouched
	});

	it('srsCards: local card with later last_review is kept over an older remote one', () => {
		const local = payload({ srsCards: [card('c1', '2026-02-01T00:00:00.000Z', 3)] });
		const remote = payload({ srsCards: [card('c1', '2026-01-01T00:00:00.000Z', 9)] });
		const { merged, summary } = mergePayloads(local, remote);
		expect(merged.srsCards).toHaveLength(1);
		expect(merged.srsCards[0].last_review).toBe('2026-02-01T00:00:00.000Z');
		expect(merged.srsCards[0].reps).toBe(3);
		expect(summary.newCards).toBe(0);
	});

	it('srsCards: equal last_review ties break on higher reps; missing last_review counts as epoch 0', () => {
		const local = payload({ srsCards: [card('c1', undefined, 5)] });
		const remote = payload({ srsCards: [card('c1', undefined, 12)] });
		const { merged } = mergePayloads(local, remote);
		expect(merged.srsCards[0].reps).toBe(12);

		const local2 = payload({ srsCards: [card('c2', undefined, 1)] });
		const remote2 = payload({ srsCards: [card('c2', '2026-01-01T00:00:00.000Z', 0)] });
		const { merged: merged2 } = mergePayloads(local2, remote2);
		expect(merged2.srsCards[0].last_review).toBe('2026-01-01T00:00:00.000Z');
	});

	it('reviewLog: unions and dedups identical (cardId,ts,grade) triples; strips id', () => {
		const local = payload({ reviewLog: [review(1, 'c1', 1000, 3), review(2, 'c1', 2000, 4)] });
		const remote = payload({
			reviewLog: [review(9, 'c1', 1000, 3), review(10, 'c1', 3000, 2)]
		});
		const { merged, summary } = mergePayloads(local, remote);
		expect(merged.reviewLog).toHaveLength(3);
		expect(summary.newReviews).toBe(1); // only ts=3000 is new
		for (const r of merged.reviewLog) {
			expect(r).not.toHaveProperty('id');
		}
		expect(local.reviewLog[0].id).toBe(1); // inputs untouched
	});

	it('streak: longest is the max of both; current snapshot comes from the later lastActiveDate', () => {
		const local = payload({ streak: [streakRec(3, 7, '2026-07-01', 1, 0)] });
		const remote = payload({ streak: [streakRec(10, 12, '2026-07-05', 0, 2)] });
		const { merged } = mergePayloads(local, remote);
		expect(merged.streak).toHaveLength(1);
		expect(merged.streak[0].longestStreak).toBe(12);
		expect(merged.streak[0].currentStreak).toBe(10);
		expect(merged.streak[0].lastActiveDate).toBe('2026-07-05');
		expect(merged.streak[0].freezesUsed).toBe(2);
	});

	it('stats: same date takes field-wise max per field, never summed', () => {
		const local = payload({ stats: [stat('2026-07-01', 100, 30, 2, 5)] });
		const remote = payload({ stats: [stat('2026-07-01', 40, 60, 1, 8)] });
		const { merged } = mergePayloads(local, remote);
		expect(merged.stats).toHaveLength(1);
		const s = merged.stats[0];
		expect(s.xp).toBe(100);
		expect(s.minutes).toBe(60);
		expect(s.lessonsCompleted).toBe(2);
		expect(s.reviewsDone).toBe(8);
	});

	it('skillProfile: higher updatedAt wins the whole record', () => {
		const local = payload({ skillProfile: [skillRec('reading', 'A1', 100)] });
		const remote = payload({ skillProfile: [skillRec('reading', 'B1', 200)] });
		const { merged } = mergePayloads(local, remote);
		expect(merged.skillProfile).toHaveLength(1);
		expect(merged.skillProfile[0].estimatedLevel).toBe('B1');
		expect(merged.skillProfile[0].updatedAt).toBe(200);
	});

	it('assessments: later completedAt wins the whole record; summary counts new ones', () => {
		const local = payload({ assessments: [assessment('a1', 100, 70)] });
		const remote = payload({
			assessments: [assessment('a1', 200, 95), assessment('a2', 50)]
		});
		const { merged, summary } = mergePayloads(local, remote);
		expect(merged.assessments).toHaveLength(2);
		expect(merged.assessments.find((a) => a.assessmentId === 'a1')?.score).toBe(95);
		expect(summary.newAssessments).toBe(1);
	});

	it('settings: remote theme never overwrites local; celebratedMilestones is unioned', () => {
		const local = payload({
			settings: settings({ theme: 'dark', celebratedMilestones: [1, 2] })
		});
		const remote = payload({
			settings: settings({ theme: 'light', celebratedMilestones: [2, 3] })
		});
		const { merged } = mergePayloads(local, remote);
		expect(merged.settings?.theme).toBe('dark');
		expect(merged.settings?.celebratedMilestones?.slice().sort()).toEqual([1, 2, 3]);
	});

	it('empty remote leaves merged deep-equal to local and summary all zeros', () => {
		const local = payload({
			progress: [prog('u1', 100)],
			srsCards: [card('c1', '2026-01-01T00:00:00.000Z')],
			reviewLog: [review(1, 'c1', 1000, 3)],
			streak: [streakRec(1, 1, '2026-07-01')],
			stats: [stat('2026-07-01', 10, 5, 1, 1)],
			skillProfile: [skillRec('reading', 'A1', 1)],
			assessments: [assessment('a1', 1)],
			settings: settings()
		});
		const remote = payload();
		const { merged, summary } = mergePayloads(local, remote);
		expect(merged.progress).toEqual(local.progress);
		expect(merged.srsCards).toEqual(local.srsCards);
		expect(merged.reviewLog).toEqual(
			local.reviewLog.map((r) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping `id` to match mergePayloads' output shape
				const { id, ...rest } = r;
				return rest;
			})
		);
		expect(merged.streak).toEqual(local.streak);
		expect(merged.stats).toEqual(local.stats);
		expect(merged.skillProfile).toEqual(local.skillProfile);
		expect(merged.assessments).toEqual(local.assessments);
		expect(merged.settings).toEqual(local.settings);
		expect(summary).toEqual({ newReviews: 0, newProgress: 0, newCards: 0, newAssessments: 0 });
	});

	it('is symmetric on disjoint data: A⊕B and B⊕A contain the same records', () => {
		const a = payload({
			progress: [prog('u1', 100)],
			srsCards: [card('c1', '2026-01-01T00:00:00.000Z')],
			assessments: [assessment('a1', 10)]
		});
		const b = payload({
			progress: [prog('u2', 200)],
			srsCards: [card('c2', '2026-02-01T00:00:00.000Z')],
			assessments: [assessment('a2', 20)]
		});
		const { merged: ab } = mergePayloads(a, b);
		const { merged: ba } = mergePayloads(b, a);
		const byLesson = (p: BackupPayload) => p.progress.map((r) => r.lessonId).sort();
		const byCard = (p: BackupPayload) => p.srsCards.map((r) => r.cardId).sort();
		const byAssessment = (p: BackupPayload) => p.assessments.map((r) => r.assessmentId).sort();
		expect(byLesson(ab)).toEqual(byLesson(ba));
		expect(byCard(ab)).toEqual(byCard(ba));
		expect(byAssessment(ab)).toEqual(byAssessment(ba));
	});

	it('never mutates the local or remote inputs', () => {
		const local = payload({
			progress: [prog('u1', 100, 60)],
			srsCards: [card('c1', '2026-01-01T00:00:00.000Z', 3)],
			reviewLog: [review(1, 'c1', 1000, 3)],
			streak: [streakRec(1, 1, '2026-07-01')],
			stats: [stat('2026-07-01', 10, 5, 1, 1)],
			skillProfile: [skillRec('reading', 'A1', 1)],
			assessments: [assessment('a1', 1)],
			settings: settings({ celebratedMilestones: [1] })
		});
		const remote = payload({
			progress: [prog('u1', 200, 90)],
			srsCards: [card('c1', '2026-02-01T00:00:00.000Z', 9)],
			reviewLog: [review(2, 'c1', 2000, 4)],
			streak: [streakRec(9, 9, '2026-07-05')],
			stats: [stat('2026-07-01', 99, 99, 9, 9)],
			skillProfile: [skillRec('reading', 'B1', 99)],
			assessments: [assessment('a1', 99)],
			settings: settings({ celebratedMilestones: [2] })
		});
		const localSnapshot = JSON.parse(JSON.stringify(local));
		const remoteSnapshot = JSON.parse(JSON.stringify(remote));

		mergePayloads(local, remote);

		expect(local).toEqual(localSnapshot);
		expect(remote).toEqual(remoteSnapshot);
	});
});
