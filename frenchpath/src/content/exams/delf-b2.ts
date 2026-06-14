import type { MockExam } from '$lib/exam/types';

export const DELF_B2: MockExam = {
	id: 'delf-b2',
	title: 'Mock DELF B2',
	level: 'B2',
	sections: [
		{
			skill: 'listening',
			title: "Compréhension de l'oral",
			instructions: 'Listen and type the summary sentence you hear.',
			items: [
				{
					type: 'listening',
					id: 'delf-b2-l1',
					audioText:
						'Malgré les défis logistiques, Arjun a réussi à obtenir son visa étudiant avant la rentrée.',
					answer:
						'Malgré les défis logistiques, Arjun a réussi à obtenir son visa étudiant avant la rentrée.',
					accept: [],
					hint: 'Note malgré + passé composé.'
				}
			]
		},
		{
			skill: 'reading',
			title: 'Compréhension des écrits',
			instructions: 'Analyse the argumentative excerpt.',
			items: [
				{
					type: 'reading',
					id: 'delf-b2-r1',
					passage:
						"Si l'on veut réduire les inégalités d'accès à l'éducation, il faudrait investir davantage dans le numérique rural. En revanche, la technologie seule ne suffit pas sans formation des enseignants.",
					questions: [
						{
							prompt: 'What limitation does the author mention?',
							options: [
								'Technology alone is insufficient',
								'Teachers should be removed',
								'Rural areas need no investment',
								'Inequality does not exist'
							],
							answerIndex: 0
						}
					]
				}
			]
		},
		{
			skill: 'writing',
			title: 'Production écrite',
			instructions: 'Write ~250 words defending a viewpoint.',
			prompt:
				'Rédigez un essai : faut-il imposer le français dans certaines institutions en Inde ?',
			modelAnswer:
				"D'une part, promouvoir le français ouvre des opportunités internationales. D'autre part, imposer une langue risque de marginaliser les langues régionales. En conclusion, une politique volontariste mais non coercitive serait préférable.",
			rubric: [
				'Clear thesis and counter-argument',
				'Appropriate B2 connectors',
				'~250 words',
				'Register fits an essay',
				'Few serious grammar errors'
			]
		},
		{
			skill: 'speaking',
			title: 'Production orale',
			instructions: 'Defend an opinion for ~5 minutes.',
			prompt: 'Argumentez pour ou contre le télétravail permanent.',
			modelAnswer:
				'Je défends une position nuancée : le télétravail offre flexibilité, néanmoins il peut isoler les équipes.',
			rubric: [
				'Structured argument with examples',
				'Used advanced linking words',
				'Spoke ~5 minutes',
				'Responded to implicit counterpoints',
				'Clear pronunciation'
			]
		}
	]
};
