import { describe, it, expect } from 'vitest';
import { generatorParameters } from 'ts-fsrs';
import { createSrsCard, gradeCard, getScheduler, retrievability, FSRS_VERSION } from './fsrs';

const NOW = new Date('2026-01-01T00:00:00Z');

function freshCard() {
	return createSrsCard({
		cardId: 'c',
		contentId: 'x',
		cefrLevel: 'A1',
		skill: 'reading',
		now: NOW
	});
}

describe('createSrsCard', () => {
	it('creates a new card due now, state New, zero reps', () => {
		const card = freshCard();
		expect(card.state).toBe(0); // ts-fsrs State.New
		expect(card.reps).toBe(0);
		expect(card.due.getTime()).toBe(NOW.getTime());
		expect(card.schedulerVersion).toBe(FSRS_VERSION);
	});
});

describe('gradeCard', () => {
	it('schedules "good" further out than "again"', () => {
		const card = freshCard();
		const again = gradeCard(card, 'again', { now: NOW });
		const good = gradeCard(card, 'good', { now: NOW });
		expect(good.card.due.getTime()).toBeGreaterThan(again.card.due.getTime());
	});

	it('targetRetention affects scheduling for reviewed cards', () => {
		let card = freshCard();
		card = gradeCard(card, 'again', { now: NOW }).card;
		card = gradeCard(card, 'good', { now: NOW }).card;
		card = gradeCard(card, 'good', { now: NOW }).card;
		const later = new Date('2026-01-15T00:00:00Z');
		const low = gradeCard(card, 'good', { now: later, targetRetention: 0.7 });
		const high = gradeCard(card, 'good', { now: later, targetRetention: 0.95 });
		// Higher desired retention → shorter intervals (more frequent reviews).
		expect(low.card.scheduled_days).toBeGreaterThanOrEqual(high.card.scheduled_days);
	});

	it('increments reps and records the last grade + a review log', () => {
		const result = gradeCard(freshCard(), 'good', { now: NOW });
		expect(result.card.reps).toBe(1);
		expect(result.card.lastGrade).toBe(3); // Rating.Good
		expect(result.log.rating).toBe(3);
	});

	it('works with default now/targetRetention when options are omitted', () => {
		const result = gradeCard(freshCard(), 'good');
		expect(result.card.reps).toBe(1);
	});

	it('does not mutate the input card (immutable update)', () => {
		const card = freshCard();
		const snapshotDue = card.due.getTime();
		gradeCard(card, 'easy', { now: NOW });
		expect(card.reps).toBe(0);
		expect(card.due.getTime()).toBe(snapshotDue);
	});
});

describe('custom FSRS weights', () => {
	const defaults = generatorParameters().w;
	const custom = defaults.map((v, i) => (i === 0 ? v + 0.1 : v));

	it('getScheduler applies custom weights', () => {
		const s = getScheduler(0.9, custom);
		expect(s.parameters.w[0]).toBeCloseTo(defaults[0] + 0.1);
	});

	it('getScheduler with null/empty weights uses defaults', () => {
		expect(getScheduler(0.9, null).parameters.w).toEqual(defaults);
		expect(getScheduler(0.9, []).parameters.w).toEqual(defaults);
	});

	it('gradeCard schedules differently under different weights', () => {
		// ponytail: a single 'good' from a brand-new card follows ts-fsrs's fixed
		// short-term learning steps (1m/10m), which ignore `w` entirely — so it can't
		// show a weight effect. Graduate to Review state first (matches the
		// targetRetention test above), then grade later where stability (which `w`
		// drives) determines the interval.
		let card = createSrsCard({ cardId: 'c', contentId: 'c', cefrLevel: 'A1', skill: 'reading', now: NOW });
		card = gradeCard(card, 'good', { now: NOW }).card;
		card = gradeCard(card, 'good', { now: NOW }).card;
		const later = new Date('2026-01-15T00:00:00Z');
		const heavier = defaults.map((v) => v * 1.5);
		const a = gradeCard(card, 'good', { now: later, weights: null });
		const b = gradeCard(card, 'good', { now: later, weights: heavier });
		expect(a.card.due.getTime()).not.toBe(b.card.due.getTime());
	});
});

describe('retrievability', () => {
	it('returns a probability between 0 and 1', () => {
		const r = retrievability(freshCard(), NOW);
		expect(r).toBeGreaterThanOrEqual(0);
		expect(r).toBeLessThanOrEqual(1);
	});

	it('defaults `now` to the current time when omitted', () => {
		const r = retrievability(freshCard());
		expect(r).toBeGreaterThanOrEqual(0);
		expect(r).toBeLessThanOrEqual(1);
	});
});
