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

interface Target {
	keys: string[];
	/** Index into card.forms, or -1 when it comes from card.french. */
	formIndex: number;
}

/** Article-stripped word-key sequences per " / " variant, so the article stays outside the blank. */
function targetPhrases(french: string, formIndex: number): Target[] {
	const out: Target[] = [];
	for (const variant of french.split(' / ')) {
		if (variant.includes('…')) continue;
		const bare = variant.replace(ARTICLE, '') || variant;
		const keys = tokenizeFrench(bare.replace(/[’‘]/g, "'"))
			.filter((t) => t.type === 'word')
			.map((t) => key(t.value))
			.filter(Boolean);
		if (keys.length) out.push({ keys, formIndex });
	}
	return out;
}

// Normalized (accent-free) regular -er endings: present, imparfait, futur, participe.
const ER_SUFFIX =
	/^(?:e|es|ent|ons|ez|ai|as|ais|ait|ions|iez|aient|erai|eras|era|erons|erez|eront|ee|ees)$/;

type Fuzz = 'exact' | 'plural' | 'er';

// ponytail: single-word fuzz = plural -s and regular -er endings only, tried only when no exact hit; irregular conjugations need `forms` in content.
function fuzzOf(word: string, target: string): Fuzz | null {
	if (word === target) return 'exact';
	if (word === `${target}s`) return 'plural';
	if (target.length > 4 && target.endsWith('er')) {
		const stem = target.slice(0, -2);
		if (word.startsWith(stem) && ER_SUFFIX.test(word.slice(stem.length))) return 'er';
	}
	return null;
}

interface Hit {
	index: number;
	length: number;
	fuzz: Fuzz;
	target: Target;
}

function findHit(words: { key: string }[], targets: Target[], fuzzy: boolean): Hit | null {
	for (let i = 0; i < words.length; i++) {
		for (const target of targets) {
			if (i + target.keys.length > words.length) continue;
			if (target.keys.length === 1) {
				const fuzz = fuzzOf(words[i].key, target.keys[0]);
				if (fuzz && (fuzz === 'exact') !== fuzzy) return { index: i, length: 1, fuzz, target };
			} else if (!fuzzy && target.keys.every((k, j) => words[i + j].key === k)) {
				return { index: i, length: target.keys.length, fuzz: 'exact', target };
			}
		}
	}
	return null;
}

/** Infinitive-looking single word ("parler", "se lever" -> "lever"), else null. */
function erInfinitive(french: string): string | null {
	const d = displayForm(french);
	return /^\p{L}{3,}er$/u.test(d) ? d : null;
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
	const words: { end: number; value: string; key: string }[] = [];
	let pos = 0;
	for (const t of tokens) {
		pos += t.value.length;
		if (t.type === 'word') words.push({ end: pos, value: t.value, key: key(t.value) });
	}

	const targets = [card.french, ...(card.forms ?? [])]
		.flatMap((f, i) => targetPhrases(f, i - 1))
		// Longest first so "il y a" wins over a shorter overlap.
		.sort((a, b) => b.keys.length - a.keys.length);
	const hit = findHit(words, targets, false) ?? findHit(words, targets, true);
	if (!hit) return null;

	const first = words[hit.index];
	const last = words[hit.index + hit.length - 1];
	const start = first.end - stripContraction(first.value).length;
	const before = sentence.slice(0, start);
	const answer = sentence.slice(start, last.end);
	const after = sentence.slice(last.end);

	const sentenceKeys = words.map((w) => w.key);
	const taken = new Set([key(answer), ...sentenceKeys]);
	// ponytail: no part-of-speech field; unit+gender is the proxy — add a pos tag in content if distractors read as obviously wrong.
	const rank = (c: CandidateCard): number =>
		c.unitId === unitId ? 0 : c.card.cefrLevel === card.cefrLevel ? 1 : 2;
	const ordered = candidates
		.map((c, i) => ({ c, i }))
		.sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
		.map(({ c }) => c);

	// Distractors must look like the answer: same inflection of -er verbs, same form slot of `forms`.
	const erSuffix = hit.fuzz === 'er' ? answer.slice(hit.target.keys[0].length - 2) : null;
	const distractors: string[] = [];
	for (const { card: other } of ordered) {
		if (distractors.length === CHOICE_COUNT - 1) break;
		if (other.id === card.id) continue;
		if (card.gender !== 'none' && other.gender !== card.gender) continue;
		let shown: string | undefined;
		if (erSuffix !== null) {
			const inf = erInfinitive(other.french);
			shown = inf ? inf.slice(0, -2) + erSuffix : undefined;
		} else if (hit.fuzz === 'exact' && hit.target.formIndex >= 0) {
			shown = other.forms?.[hit.target.formIndex];
		} else {
			shown = displayForm(other.french);
		}
		if (!shown) continue;
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
