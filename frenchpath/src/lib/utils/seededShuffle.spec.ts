import { describe, expect, it } from 'vitest';
import { shuffledIndices } from './seededShuffle';

describe('shuffledIndices', () => {
	it('returns every index exactly once', () => {
		// Arrange
		const count = 4;

		// Act
		const order = shuffledIndices(count, 'a1-u1-ex9');

		// Assert
		expect([...order].sort()).toEqual([0, 1, 2, 3]);
	});

	it('gives the same order for the same seed', () => {
		expect(shuffledIndices(4, 'seed-a')).toEqual(shuffledIndices(4, 'seed-a'));
	});

	it('does not always put the first index first', () => {
		// Arrange: 200 different seeds, 4 options each.
		const seeds = Array.from({ length: 200 }, (_, i) => `seed-${i}`);

		// Act
		const firstStaysFirst = seeds.filter((seed) => shuffledIndices(4, seed)[0] === 0).length;

		// Assert: an even shuffle leaves index 0 first about a quarter of the time.
		expect(firstStaysFirst).toBeGreaterThan(20);
		expect(firstStaysFirst).toBeLessThan(80);
	});

	it('handles zero and one option', () => {
		expect(shuffledIndices(0, 'x')).toEqual([]);
		expect(shuffledIndices(1, 'x')).toEqual([0]);
	});
});
