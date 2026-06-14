import type { MockExam } from '$lib/exam/types';

export const DALF_C1: MockExam = {
	id: 'dalf-c1',
	title: 'Mock DALF C1',
	level: 'C1',
	sections: [
		{
			skill: 'listening',
			title: "Compréhension de l'oral",
			instructions: 'Listen to the exposé excerpt and transcribe the thesis sentence.',
			items: [
				{
					type: 'listening',
					id: 'dalf-c1-l1',
					audioText:
						"La question n'est pas de savoir si la diaspora indienne influence la francophonie, mais comment cette influence reconfigure les normes linguistiques.",
					answer:
						"La question n'est pas de savoir si la diaspora indienne influence la francophonie, mais comment cette influence reconfigure les normes linguistiques.",
					accept: []
				}
			]
		},
		{
			skill: 'reading',
			title: 'Compréhension des écrits',
			instructions: 'Synthèse: identify convergences between implicit meanings.',
			items: [
				{
					type: 'reading',
					id: 'dalf-c1-r1',
					passage:
						"Document A suggère que la maîtrise du français facilite l'accès aux réseaux académiques européens. Document B insiste sur le risque d'homogénéisation culturelle. Les deux conviennent que l'apprentissage doit rester critique et contextualisé.",
					questions: [
						{
							prompt: 'What point do both documents share?',
							options: [
								'Learning must stay critical and contextualized',
								'French should replace local languages',
								'Academic networks are irrelevant',
								'Cultural homogenization is desirable'
							],
							answerIndex: 0
						}
					]
				}
			]
		},
		{
			skill: 'writing',
			title: 'Essai argumenté',
			instructions: 'Write a structured C1 essay (~400 words), then self-assess.',
			prompt:
				"Synthèse et essai : le français peut-il être un atout pour l'Inde sans devenir un instrument de domination culturelle ?",
			modelAnswer:
				"En définitive, le français demeure un atout lorsqu'il est choisi librement et en dialogue avec les langues indiennes. Néanmoins, toute politique linguistique doit éviter la domination symbolique.",
			rubric: [
				'Synthèse of multiple viewpoints',
				'Personal argued thesis',
				'C1 connectors and nominalisation',
				'~400 words',
				'Consistent register'
			]
		},
		{
			skill: 'speaking',
			title: 'Exposé',
			instructions: 'Deliver a 10-minute exposé with plan, then self-assess.',
			prompt:
				"Présentez un exposé sur l'impact de la francophonie sur la mobilité étudiante indienne.",
			modelAnswer:
				"Introduction : problématique. I. Atouts académiques. II. Risques d'inégalités. III. Pistes équilibrées. Conclusion.",
			rubric: [
				'Clear plan announced and followed',
				'~10 minutes',
				'Handles abstract vocabulary',
				'Engages with counter-arguments',
				'Coherent delivery'
			]
		}
	]
};
