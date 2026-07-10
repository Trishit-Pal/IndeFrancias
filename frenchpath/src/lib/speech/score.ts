// Pure pronunciation scoring: aligns Vosk's recognized words against the
// expected phrase and issues a per-word verdict. No audio, no DOM.
import { normalizeAnswer } from '../lesson/engine';

export interface VoskWord {
	word: string;
	conf: number;
}
export interface WordVerdict {
	expected: string;
	verdict: 'good' | 'unclear' | 'missed';
}
export interface PronunciationScore {
	words: WordVerdict[];
	overall: 'good' | 'partial' | 'retry';
}

const CONF_GOOD = 0.7;
/** Normalized edit-distance ratio below which two words count as "close". */
const CLOSE_RATIO = 0.4;

function editDistance(a: string, b: string): number {
	const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
	for (let j = 1; j <= b.length; j++) {
		let prev = dp[0];
		dp[0] = j;
		for (let i = 1; i <= a.length; i++) {
			const cur = dp[i];
			dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
			prev = cur;
		}
	}
	return dp[a.length];
}

function isClose(a: string, b: string): boolean {
	const d = editDistance(a, b);
	return d / Math.max(a.length, b.length, 1) <= CLOSE_RATIO;
}

/** Greedy in-order alignment of expected words to recognized words. */
export function scorePronunciation(
	expectedPhrase: string,
	recognized: VoskWord[]
): PronunciationScore {
	// Tokenize once, then derive the normalized form per-token so the two
	// sequences can never drift out of alignment (see score.spec.ts mid-phrase
	// punctuation regression test).
	const expectedTokens = expectedPhrase
		.split(/\s+/)
		.filter(Boolean)
		.map((orig) => ({ orig, norm: normalizeAnswer(orig) }))
		.filter((t) => t.norm.length > 0);
	const heard = recognized.map((r) => ({ ...r, norm: normalizeAnswer(r.word) }));
	let cursor = 0;
	const words: WordVerdict[] = expectedTokens.map(({ orig: expOrig, norm: expNorm }) => {
		for (let i = cursor; i < heard.length; i++) {
			const h = heard[i];
			if (h.norm === expNorm) {
				cursor = i + 1;
				return { expected: expOrig, verdict: h.conf >= CONF_GOOD ? 'good' : 'unclear' };
			}
			if (isClose(h.norm, expNorm)) {
				cursor = i + 1;
				return { expected: expOrig, verdict: 'unclear' };
			}
		}
		return { expected: expOrig, verdict: 'missed' };
	});
	const good = words.filter((x) => x.verdict === 'good').length;
	const missedAll = words.every((x) => x.verdict === 'missed');
	const overall = missedAll ? 'retry' : good === words.length ? 'good' : 'partial';
	return { words, overall };
}
