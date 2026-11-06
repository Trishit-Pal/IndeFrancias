import type { Card } from '$lib/content/schema';
import { normalizeFrenchToken, stripContraction, tokenizeFrench } from '$lib/content/lexicon';

export interface ContextPrompt {
	before: string;
	answer: string;
	after: string;
	/** Length 4, includes `answer`. */
	choices: string[];
	/** answer, card.french, ...card.forms */
	accepted: string[];
}

export interface CandidateCard {
	card: Card;
	unitId: string;
}

const CHOICE_COUNT = 4;

const key = (token: string): string => normalizeFrenchToken(stripContraction(token));

function hashSeed(seed: string): number {
	let h = 0x811c9dc5; // FNV-1a
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

function mulberry32(a: number): () => number {
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: readonly T[], seed: string): T[] {
	const out = [...items];
	const rand = mulberry32(hashSeed(seed));
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

const capitalize = (s: string): string => s.charAt(0).toLocaleUpperCase('fr') + s.slice(1);

const ARTICLE = /^(?:les|le|la|une|un|des|du|de la|de l'|l'|se|s')(?:\s+|(?<=')\s*)/i;

/** First " / " variant, leading article removed. */
function displayForm(french: string): string {
	return french.split(' / ')[0].replace(ARTICLE, '').trim() || french;
}

/** Word-key sequences a card can appear as: each " / " variant, with and without its article. */
function targetPhrases(french: string): string[][] {
	const out: string[][] = [];
	for (const variant of french.split(' / ')) {
		if (variant.includes('…')) continue;
		for (const v of new Set([variant, variant.replace(ARTICLE, '')])) {
			const ks = tokenizeFrench(v.replace(/[’‘]/g, "'"))
				.filter((t) => t.type === 'word')
				.map((t) => key(t.value))
				.filter(Boolean);
			if (ks.length) out.push(ks);
		}
	}
	// Longest first so "il y a" wins over a shorter overlap.
	return out.sort((a, b) => b.length - a.length);
}

// ponytail: single-word fuzz = plural -s and regular -er endings only; irregular conjugations need `forms` in content.
function wordMatches(word: string, target: string, isSingle: boolean): boolean {
	if (word === target) return true;
	if (!isSingle) return false;
	if (word === `${target}s`) return true;
	if (target.length > 4 && target.endsWith('er')) {
		const stem = target.slice(0, -2);
		return word.startsWith(stem) && word.length - stem.length <= 3;
	}
	return false;
}

/**
 * Turns a card's example sentence into a fill-in-the-blank prompt with 4 choices.
 * Returns null when the sentence can't be blanked or fewer than 3 distractors qualify.
 */
export function buildContextPrompt(
	card: Card,
	unitId: string,
	candidates: readonly CandidateCard[],
	seed: string
): ContextPrompt | null {
	const sentence = card.example?.french;
	if (!sentence) return null;

	// Same length as the original, so token offsets map back onto `sentence`.
	const tokens = tokenizeFrench(sentence.replace(/[’‘]/g, "'"));
	const words: { start: number; end: number; value: string; key: string }[] = [];
	let pos = 0;
	for (const t of tokens) {
		if (t.type === 'word')
			words.push({ start: pos, end: pos + t.value.length, value: t.value, key: key(t.value) });
		pos += t.value.length;
	}

	const targets = [card.french, ...(card.forms ?? [])].flatMap(targetPhrases);
	let before = '';
	let answer = '';
	let after = '';
	for (let i = 0; i < words.length && !answer; i++) {
		for (const target of targets) {
			const last = words[i + target.length - 1];
			if (!last || !target.every((k, j) => wordMatches(words[i + j].key, k, target.length === 1)))
				continue;
			const first = words[i];
			const start = first.end - stripContraction(first.value).length;
			before = sentence.slice(0, start);
			answer = sentence.slice(start, last.end);
			after = sentence.slice(last.end);
			break;
		}
	}
	if (!answer) return null;

	const sentenceKeys = words.map((w) => w.key);
	const taken = new Set([key(answer), ...sentenceKeys]);
	// ponytail: no part-of-speech field; unit+gender is the proxy — add a pos tag in content if distractors read as obviously wrong.
	const rank = (c: CandidateCard): number =>
		c.unitId === unitId ? 0 : c.card.cefrLevel === card.cefrLevel ? 1 : 2;
	const ordered = candidates
		.map((c, i) => ({ c, i }))
		.sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
		.map(({ c }) => c);

	const distractors: string[] = [];
	for (const { card: other } of ordered) {
		if (distractors.length === CHOICE_COUNT - 1) break;
		if (other.id === card.id) continue;
		if (card.gender !== 'none' && other.gender !== card.gender) continue;
		const shown = displayForm(other.french);
		const k = key(shown);
		if (taken.has(k)) continue;
		taken.add(k);
		distractors.push(shown);
	}
	if (distractors.length < CHOICE_COUNT - 1) return null;

	const sentenceInitial = before.trim() === '' && /^\p{Lu}/u.test(answer);
	const options = sentenceInitial ? distractors.map(capitalize) : distractors;

	return {
		before,
		answer,
		after,
		choices: shuffle([answer, ...options], seed),
		accepted: [answer, card.french, ...(card.forms ?? [])]
	};
}
