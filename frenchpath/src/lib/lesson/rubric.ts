// Pure writing-rubric evaluation: regex rules from content packs run over the
// learner's normalized free-text answer. No DOM, no storage.
import type { Exercise, RubricRule } from '../content/schema';
import type { NativeLanguage } from '../db/schema';
import { normalizeAnswer } from './engine';

export interface RubricHint {
	ruleId: string;
	hint: string;
	severity: 'gentle' | 'correction';
}

/** Most feedback per answer before it becomes noise. */
const MAX_HINTS = 2;

const SEVERITY_RANK: Record<RubricHint['severity'], number> = {
	correction: 0,
	gentle: 1
};

function compileRule(rule: RubricRule): RegExp | null {
	try {
		return new RegExp(rule.match, 'iu');
	} catch {
		return null; // malformed content must never crash a lesson
	}
}

/** Evaluates an exercise's rubric rules against a learner's answer. */
export function evaluateRubric(
	answerText: string,
	exercise: Exercise,
	nativeLang?: NativeLanguage
): RubricHint[] {
	const rules = 'rubricRules' in exercise ? (exercise.rubricRules ?? []) : [];
	if (rules.length === 0) return [];
	const normalized = normalizeAnswer(answerText);
	return rules
		.map((rule) => ({ rule, re: compileRule(rule) }))
		.filter((x): x is { rule: RubricRule; re: RegExp } => x.re !== null)
		.filter(({ re }) => re.test(normalized))
		.map(({ rule }) => ({
			ruleId: rule.id,
			hint: (nativeLang ? rule.hintByLang?.[nativeLang] : undefined) ?? rule.hint,
			severity: rule.severity
		}))
		.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
		.slice(0, MAX_HINTS);
}
