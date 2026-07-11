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

/** "j'ai" / "j’ai" / "est-ce" → ["j","ai"] / ["est","ce"]. Vosk hears elisions
 *  and hyphenations as separate words, so BOTH sides must tokenize alike.
 *  Split the RAW text first: normalizeAnswer deletes curly ’, which would
 *  otherwise fuse "j’ai" into "jai" with no split point left. */
function subWords(raw: string): string[] {
	return raw
		.split(/['’-]+/)
		.map(normalizeAnswer)
		.filter((n) => n.length > 0);
}

/** Greedy in-order alignment of expected words to recognized words. */
export function scorePronunciation(
	expectedPhrase: string,
	recognized: VoskWord[]
): PronunciationScore {
	// Tokenize once, then derive normalized sub-words per token so the two
	// sequences can never drift out of alignment (see score.spec.ts mid-phrase
	// punctuation and elision regression tests).
	const expectedTokens = expectedPhrase
		.split(/\s+/)
		.filter(Boolean)
		.map((orig) => ({ orig, norms: subWords(orig) }))
		.filter((t) => t.norms.length > 0);
	const heard = recognized.flatMap((r) => subWords(r.word).map((norm) => ({ norm, conf: r.conf })));
	let cursor = 0;
	const words: WordVerdict[] = expectedTokens.map(({ orig, norms }) => {
		const verdicts = norms.map((expNorm): WordVerdict['verdict'] => {
			for (let i = cursor; i < heard.length; i++) {
				const h = heard[i];
				if (h.norm === expNorm) {
					cursor = i + 1;
					return h.conf >= CONF_GOOD ? 'good' : 'unclear';
				}
				if (isClose(h.norm, expNorm)) {
					cursor = i + 1;
					return 'unclear';
				}
			}
			return 'missed';
		});
		// One chip per WRITTEN word: aggregate its sub-word verdicts.
		const verdict = verdicts.every((v) => v === 'good')
			? 'good'
			: verdicts.every((v) => v === 'missed')
				? 'missed'
				: 'unclear';
		return { expected: orig, verdict };
	});
	const good = words.filter((x) => x.verdict === 'good').length;
	const missedAll = words.every((x) => x.verdict === 'missed');
	const overall = missedAll ? 'retry' : good === words.length ? 'good' : 'partial';
	return { words, overall };
}
