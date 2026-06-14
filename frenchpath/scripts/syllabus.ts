// The A1–C1 syllabus the content generator targets. B1+ briefs live in
// scripts/syllabus-b1-c1.ts (seeded via scripts/seed-b1-c1.ts).
export interface UnitBrief {
	id: string;
	cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
	order: number;
	title: string;
	objective: string; // CEFR can-do, paraphrased
	grammar: string; // grammar focus for this unit
	vocab: string; // vocabulary theme
	context: string; // Indian-context hint for examples
	exerciseTypes: string[]; // suggested mix (mcq, cloze, matching, dictation, translation, reorder, conjugation, gender)
}

export const SYLLABUS: UnitBrief[] = [
	{
		id: 'a1-unit-01',
		cefrLevel: 'A1',
		order: 1,
		title: 'Bonjour ! — Greetings & introducing yourself',
		objective: 'Greet people, say your name, use basic courtesy words.',
		grammar: 'être (intro), je m’appelle, un/une (gender intro)',
		vocab: 'greetings, courtesy, friend',
		context: 'Priya & Arjun greeting in Mumbai/Bangalore',
		exerciseTypes: ['mcq', 'cloze', 'matching', 'gender', 'reorder', 'translation']
	},
	{
		id: 'a1-unit-02',
		cefrLevel: 'A1',
		order: 2,
		title: 'Ma famille — Family & possessives',
		objective: 'Talk about your family and belongings.',
		grammar: 'avoir, possessives mon/ma/mes, ton/ta/tes',
		vocab: 'family members, ages',
		context: 'joint families, Diwali visits to Jaipur',
		exerciseTypes: ['mcq', 'cloze', 'gender', 'conjugation', 'translation', 'matching']
	},
	{
		id: 'a1-unit-03',
		cefrLevel: 'A1',
		order: 3,
		title: 'Les nombres et l’heure — Numbers, days & time',
		objective: 'Count, tell the time, and name days of the week.',
		grammar: 'numbers 0–69, quelle heure est-il, days',
		vocab: 'numbers, time, days',
		context: 'train times, market prices in rupees',
		exerciseTypes: ['mcq', 'cloze', 'dictation', 'matching', 'translation']
	},
	{
		id: 'a1-unit-04',
		cefrLevel: 'A1',
		order: 4,
		title: 'Au restaurant — Food & drink',
		objective: 'Order food and drink and express preferences.',
		grammar: 'partitive du/de la/des, je voudrais, aimer',
		vocab: 'food, drinks, meals',
		context: 'dal, biryani, masala chai, thali',
		exerciseTypes: ['mcq', 'cloze', 'gender', 'translation', 'reorder', 'matching']
	},
	{
		id: 'a1-unit-05',
		cefrLevel: 'A1',
		order: 5,
		title: 'Les verbes en -er — Regular present tense',
		objective: 'Describe everyday actions with regular -er verbs.',
		grammar: 'present tense of regular -er verbs',
		vocab: 'daily actions: parler, habiter, travailler, aimer',
		context: 'living in Indian cities, working, studying',
		exerciseTypes: ['conjugation', 'cloze', 'mcq', 'reorder', 'translation']
	},
	{
		id: 'a1-unit-06',
		cefrLevel: 'A1',
		order: 6,
		title: 'Être, avoir, aller, faire — Key irregular verbs',
		objective: 'Use the four most important irregular verbs.',
		grammar: 'être, avoir, aller, faire (present); être vs avoir errors',
		vocab: 'states, possession, going, doing',
		context: 'common être/avoir mistakes (j’ai faim, j’ai 20 ans)',
		exerciseTypes: ['conjugation', 'mcq', 'cloze', 'translation', 'matching']
	},
	{
		id: 'a1-unit-07',
		cefrLevel: 'A1',
		order: 7,
		title: 'Questions et négation — Asking & saying no',
		objective: 'Ask simple questions and make negative statements.',
		grammar: 'est-ce que, qu’est-ce que, ne…pas',
		vocab: 'question words, everyday verbs',
		context: 'asking for directions in Delhi',
		exerciseTypes: ['mcq', 'cloze', 'reorder', 'translation', 'matching']
	},
	{
		id: 'a1-unit-08',
		cefrLevel: 'A1',
		order: 8,
		title: 'En ville — Places & directions',
		objective: 'Locate places and give simple directions.',
		grammar: 'il y a, prepositions of place, à + le/la',
		vocab: 'city places, directions',
		context: 'markets, temples, metro stations',
		exerciseTypes: ['mcq', 'cloze', 'gender', 'reorder', 'matching']
	},
	{
		id: 'a1-unit-09',
		cefrLevel: 'A1',
		order: 9,
		title: 'Le futur proche — Near future & plans',
		objective: 'Say what you are going to do.',
		grammar: 'aller + infinitive',
		vocab: 'leisure, plans, time markers',
		context: 'festival plans, weekend trips',
		exerciseTypes: ['conjugation', 'cloze', 'mcq', 'reorder', 'translation']
	},
	{
		id: 'a1-unit-10',
		cefrLevel: 'A1',
		order: 10,
		title: 'Ma journée — Daily routine',
		objective: 'Describe a typical day and habits.',
		grammar: 'present tense review, time expressions',
		vocab: 'daily routine, frequency',
		context: 'a student’s day in Pune',
		exerciseTypes: ['cloze', 'conjugation', 'mcq', 'translation', 'matching']
	},
	{
		id: 'a2-unit-01',
		cefrLevel: 'A2',
		order: 1,
		title: 'Le passé composé (avoir) — Talking about the past',
		objective: 'Recount past events using avoir as auxiliary.',
		grammar: 'passé composé with avoir, past participles',
		vocab: 'past actions, time markers (hier, la semaine dernière)',
		context: 'describing a weekend trip to Goa',
		exerciseTypes: ['conjugation', 'cloze', 'mcq', 'reorder', 'translation']
	},
	{
		id: 'a2-unit-02',
		cefrLevel: 'A2',
		order: 2,
		title: 'Le passé composé (être) — Movement verbs',
		objective: 'Use être verbs in the past with agreement.',
		grammar: 'passé composé with être, agreement',
		vocab: 'movement verbs (aller, venir, arriver, partir)',
		context: 'travelling between Indian cities',
		exerciseTypes: ['conjugation', 'cloze', 'mcq', 'gender', 'translation']
	},
	{
		id: 'a2-unit-03',
		cefrLevel: 'A2',
		order: 3,
		title: 'L’imparfait — Describing the past',
		objective: 'Describe past situations, habits and backgrounds.',
		grammar: 'imparfait formation and use',
		vocab: 'childhood, descriptions, habits',
		context: 'growing up in a small Indian town',
		exerciseTypes: ['conjugation', 'cloze', 'mcq', 'translation', 'matching']
	},
	{
		id: 'a2-unit-04',
		cefrLevel: 'A2',
		order: 4,
		title: 'Les verbes pronominaux — Reflexive verbs',
		objective: 'Describe your daily routine with reflexive verbs.',
		grammar: 'reflexive verbs (se lever, se laver), present',
		vocab: 'morning routine',
		context: 'getting ready for work/college',
		exerciseTypes: ['conjugation', 'cloze', 'reorder', 'mcq', 'translation']
	},
	{
		id: 'a2-unit-05',
		cefrLevel: 'A2',
		order: 5,
		title: 'Faire les courses — Shopping & comparatives',
		objective: 'Shop, ask quantities and compare items.',
		grammar: 'quantities, comparatives (plus/moins/aussi … que)',
		vocab: 'shops, quantities, prices',
		context: 'bargaining in an Indian bazaar',
		exerciseTypes: ['mcq', 'cloze', 'translation', 'reorder', 'matching']
	},
	{
		id: 'a2-unit-06',
		cefrLevel: 'A2',
		order: 6,
		title: 'Les pronoms COD/COI — Object pronouns',
		objective: 'Replace nouns with direct/indirect object pronouns.',
		grammar: 'le/la/les, lui/leur placement',
		vocab: 'everyday verbs taking objects',
		context: 'talking about friends and gifts',
		exerciseTypes: ['mcq', 'cloze', 'reorder', 'translation']
	},
	{
		id: 'a2-unit-07',
		cefrLevel: 'A2',
		order: 7,
		title: 'Les projets — Plans & the future',
		objective: 'Talk about future plans and intentions.',
		grammar: 'futur proche vs futur simple (intro)',
		vocab: 'goals, travel, study plans',
		context: 'planning to study or work abroad',
		exerciseTypes: ['conjugation', 'cloze', 'mcq', 'translation']
	},
	{
		id: 'a2-unit-08',
		cefrLevel: 'A2',
		order: 8,
		title: 'Donner son opinion — Giving opinions',
		objective: 'Express and justify simple opinions.',
		grammar: 'je pense que, parce que, connectors',
		vocab: 'opinions, feelings, reasons',
		context: 'discussing films, food, cricket',
		exerciseTypes: ['mcq', 'cloze', 'translation', 'reorder', 'matching']
	}
];
