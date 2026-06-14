/** Syllabus briefs for B1, B2, and C1 units — consumed by seed-b1-c1.ts */

export type Cefr = 'B1' | 'B2' | 'C1';

export interface VocabWord {
	fr: string;
	en: string;
	hi: string;
	gender?: 'masculine' | 'feminine' | 'none';
	exampleFr: string;
	exampleEn: string;
	exampleHi: string;
	skills?: string[];
}

export interface UnitBriefB1C1 {
	id: string;
	cefrLevel: Cefr;
	order: number;
	title: string;
	objective: string;
	grammar: string;
	vocabWords: VocabWord[];
	bridgeTitle: string;
	bridgeBody: string;
	bridgeQuizPrompt: string;
	bridgeQuizOptions: string[];
	mcqPrompt: string;
	mcqOptions: string[];
	mcqExplanation: string;
	clozeText: string;
	clozeAnswer: string;
	translationPrompt: string;
	translationAnswer: string;
	dictationText: string;
	reorderWords: string[];
	hint: string;
	coachNote: string;
	readingPassage?: string;
	readingQuestion?: string;
	readingOptions?: string[];
	productivePrompt?: string;
	productiveModel?: string;
}

function vocab(
	fr: string,
	en: string,
	hi: string,
	exFr: string,
	exEn: string,
	exHi: string,
	gender: VocabWord['gender'] = 'none'
): VocabWord {
	return {
		fr,
		en,
		hi,
		gender,
		exampleFr: exFr,
		exampleEn: exEn,
		exampleHi: exHi,
		skills: ['reading', 'spokenInteraction']
	};
}

function unit(
	level: Cefr,
	num: number,
	title: string,
	objective: string,
	grammar: string,
	words: VocabWord[],
	extra: Partial<UnitBriefB1C1> = {}
): UnitBriefB1C1 {
	const prefix = level.toLowerCase();
	const id = `${prefix}-unit-${String(num).padStart(2, '0')}`;
	const w0 = words[0]!;
	return {
		id,
		cefrLevel: level,
		order: num,
		title,
		objective,
		grammar,
		vocabWords: words,
		bridgeTitle: extra.bridgeTitle ?? `Bridge: ${grammar}`,
		bridgeBody:
			extra.bridgeBody ??
			`**${grammar}** — Hindi learners often map this to patterns they know from English exams. Practise with Indian contexts: Priya in Mumbai, Arjun in Delhi.`,
		bridgeQuizPrompt: extra.bridgeQuizPrompt ?? `What is the focus of « ${title} »?`,
		bridgeQuizOptions: extra.bridgeQuizOptions ?? [
			grammar,
			'Ignore grammar entirely',
			'Only numbers, never verbs'
		],
		mcqPrompt: extra.mcqPrompt ?? `Which sentence best shows ${grammar}?`,
		mcqOptions: extra.mcqOptions ?? [
			words[1]?.exampleFr ?? w0.exampleFr,
			'Je hier aller marché.',
			'Il mange hier le passé.',
			'Nous suis content.'
		],
		mcqExplanation: extra.mcqExplanation ?? `Correct usage reflects ${grammar}.`,
		clozeText: extra.clozeText ?? `Priya dit : « Je {{}} contente aujourd'hui. »`,
		clozeAnswer: extra.clozeAnswer ?? 'suis',
		translationPrompt: extra.translationPrompt ?? words[2]?.exampleFr ?? w0.exampleFr,
		translationAnswer: extra.translationAnswer ?? words[2]?.exampleEn ?? w0.exampleEn,
		dictationText: extra.dictationText ?? words[3]?.exampleFr ?? w0.exampleFr,
		reorderWords: extra.reorderWords ?? ['Priya', 'habite', 'à', 'Mumbai', 'en', 'Inde', '.'],
		hint: extra.hint ?? `Think about ${grammar} and unit vocabulary.`,
		coachNote: extra.coachNote ?? `${grammar} unlocks more natural French at ${level}.`,
		...extra
	};
}

const B1_TOPICS = [
	['Passé composé vs imparfait', 'Narrating past events', 'passé composé / imparfait contrast'],
	['Object pronouns', 'Using le, la, les, lui, leur', 'COD/COI pronouns'],
	['Subjunctive introduction', 'Expressing doubt and desire', 'subjunctive after il faut que'],
	['Opinions & debates', 'Agreeing and disagreeing', 'expressions of opinion'],
	['Travel & transport', 'Booking and navigating', 'future proche / travel vocab'],
	['Work & studies', 'Describing jobs and studies', 'present professional register'],
	['Health & wellbeing', 'Doctor visits and advice', 'imperative + health'],
	['Environment', 'Talking about climate and cities', 'comparatives'],
	['Media & news', 'Understanding headlines', 'passive voice intro'],
	['Conditional present', 'Hypothetical situations', 'si + imparfait → conditionnel'],
	['Relative pronouns', 'Qui, que, dont, où', 'relative clauses'],
	['B1 synthesis', 'Mixed B1 review', 'integrated B1 skills']
] as const;

const B2_TOPICS = [
	['Plus-que-parfait', 'Earlier past events', 'plus-que-parfait'],
	['Passive voice', 'Formal descriptions', 'être + participe passé'],
	['Subjunctive nuances', 'Emotion, doubt, concession', 'subjunctive triggers'],
	['Register & formality', 'Tu vs vous in context', 'register switching'],
	['Argumentation', 'Building a line of reasoning', 'connectors pour / contre'],
	['Professional French', 'Emails and meetings', 'professional correspondence'],
	['Culture & society', 'Indian diaspora in France', 'abstract nouns'],
	['Literary tenses', 'Passé simple recognition', 'passé simple in texts'],
	['Conditionnel passé', 'Regrets and hypotheses', 'conditionnel passé'],
	['Discourse markers', 'Cependant, en revanche', 'advanced connectors'],
	['Media analysis', 'Critique and summary', 'summary verbs'],
	['B2 synthesis', 'Mixed B2 review', 'integrated B2 skills']
] as const;

const C1_TOPICS = [
	['Nominalisation', 'Turning verbs into nouns', 'nominalisation'],
	['Implicit meaning', 'Reading between the lines', 'implicit meaning'],
	['Stylistic variation', 'Formal vs informal registers', 'stylistic variation'],
	['Academic French', 'Structuring essays', 'academic discourse'],
	['Professional negotiation', 'Nuanced disagreement', 'negotiation language'],
	['Literary analysis', 'Tone and imagery', 'literary analysis'],
	['Synthesis skills', 'Combining sources', 'synthèse de documents'],
	['Argumentative essay', 'Essai argumenté', 'argumentative writing'],
	['Oral exposé', 'Structured presentation', 'exposé structure'],
	['C1 capstone', 'DALF C1 readiness', 'C1 integration']
] as const;

function wordsForTopic(topic: string): VocabWord[] {
	return [
		vocab(
			topic.split(' ')[0]!.toLowerCase().slice(0, 8) || 'notion',
			`key idea: ${topic}`,
			`मुख्य विचार: ${topic}`,
			`Cette notion est essentielle pour Priya à Mumbai.`,
			`This concept is essential for Priya in Mumbai.`,
			`यह अवधारणा मुंबई में प्रिया के लिए आवश्यक है।`
		),
		vocab(
			'cependant',
			'however',
			'हालाँकि',
			'Cependant, Arjun préfère étudier le soir.',
			'However, Arjun prefers to study in the evening.',
			'हालाँकि, अर्जुन शाम को पढ़ना पसंद करता है।'
		),
		vocab(
			'en outre',
			'furthermore',
			'इसके अलावा',
			'En outre, nous devons pratiquer chaque jour.',
			'Furthermore, we must practise every day.',
			'इसके अलावा, हमें हर दिन अभ्यास करना चाहिए।'
		),
		vocab(
			'néanmoins',
			'nevertheless',
			'फिर भी',
			'Néanmoins, le cours reste accessible.',
			'Nevertheless, the course remains accessible.',
			'फिर भी, कोर्स सुलभ रहता है।',
			'none'
		),
		vocab(
			'discours',
			'speech / discourse',
			'भाषण / प्रवचन',
			'Le discours de Priya était clair et structuré.',
			"Priya's speech was clear and structured.",
			'प्रिया का भाषण स्पष्ट और संरचित था।',
			'masculine'
		),
		vocab(
			'nuance',
			'nuance',
			'सूक्ष्म अंतर',
			'Il faut comprendre chaque nuance du texte.',
			'One must understand each nuance of the text.',
			'पाठ की प्रत्येक बारीकी को समझना चाहिए।',
			'feminine'
		)
	];
}

export const SYLLABUS_B1_C1: UnitBriefB1C1[] = [
	...B1_TOPICS.map(([title, objective, grammar], i) =>
		unit('B1', i + 1, title, objective, grammar, wordsForTopic(title), {
			reorderWords: ['Nous', 'avons', 'visité', 'Delhi', "l'année", 'dernière', '.']
		})
	),
	...B2_TOPICS.map(([title, objective, grammar], i) =>
		unit('B2', i + 1, title, objective, grammar, wordsForTopic(title), {
			clozeText: 'Il {{}} déjà terminé quand nous sommes arrivés.',
			clozeAnswer: 'avait',
			reorderWords: ['Bien', 'que', 'fatigué', ',', 'Arjun', 'a', 'continué', '.']
		})
	),
	...C1_TOPICS.map(([title, objective, grammar], i) =>
		unit('C1', i + 1, title, objective, grammar, wordsForTopic(title), {
			readingPassage:
				"La mondialisation transforme les métropoles indiennes aussi vite que les capitales européennes. Cependant, cette évolution n'efface pas les spécificités culturelles : elles se réinventent. En outre, maîtriser le français à un niveau C1 permet de participer à des débats où l'implicite compte autant que le explicite.",
			readingQuestion: 'What does the author suggest about cultural specificity?',
			readingOptions: [
				'It is reinvented rather than erased',
				'It disappears completely',
				'It is irrelevant to language learning',
				'It blocks globalization'
			],
			productivePrompt:
				'Rédigez un essai argumenté (150 mots) : le français est-il utile pour la diaspora indienne ?',
			productiveModel:
				"En somme, le français ouvre des portes académiques et professionnelles sans nier l'identité indienne. Néanmoins, l'apprentissage exige une pratique régulière et une lecture exigeante.",
			reorderWords: ['En', 'conclusion', ',', 'la', 'persévérance', 'paie', '.']
		})
	)
];
