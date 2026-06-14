import type { MockExam } from '$lib/exam/types';

export const DELF_B1: MockExam = {
	id: 'delf-b1',
	title: 'Mock DELF B1',
	level: 'B1',
	sections: [
		{
			skill: 'listening',
			title: "Compréhension de l'oral",
			instructions: 'Listen (🔊) and transcribe key sentences.',
			items: [
				{
					type: 'listening',
					id: 'delf-b1-l1',
					audioText:
						"Bien que Priya soit fatiguée, elle continue à préparer l'examen DELF à Mumbai.",
					answer: "Bien que Priya soit fatiguée, elle continue à préparer l'examen DELF à Mumbai.",
					accept: [],
					hint: 'Subjunctive after bien que.'
				}
			]
		},
		{
			skill: 'reading',
			title: 'Compréhension des écrits',
			instructions: 'Read the passage and answer.',
			items: [
				{
					type: 'reading',
					id: 'delf-b1-r1',
					passage:
						"De plus en plus d'étudiants indiens choisissent la France pour leurs études. Cependant, il faut maîtriser le français intermédiaire pour réussir au quotidien.",
					questions: [
						{
							prompt: 'Why is intermediate French important according to the text?',
							options: [
								'For daily success in France',
								'Only for tourism',
								'It is not important',
								'For learning Hindi'
							],
							answerIndex: 0
						}
					],
					hint: 'Look for cependant and the consequence.'
				}
			]
		},
		{
			skill: 'writing',
			title: 'Production écrite',
			instructions: 'Write ~120 words, then self-assess.',
			prompt:
				'Écrivez une lettre formelle pour demander des informations sur un cours de français à Lyon.',
			modelAnswer:
				"Madame, Monsieur, Je me permets de vous écrire afin d'obtenir des renseignements sur vos cours de français. Je suis actuellement à Mumbai et je prévois d'arriver à Lyon en septembre. Cordialement, Priya.",
			rubric: [
				'I used formal register (Madame, Monsieur, Cordialement)',
				'I stated my purpose clearly',
				'I wrote at least 120 words',
				'Connectors link my ideas',
				'Spelling and grammar are mostly correct'
			]
		},
		{
			skill: 'speaking',
			title: 'Production orale',
			instructions: 'Prepare a 3-minute monologue, then self-assess.',
			prompt: "Décrivez un voyage mémorable en utilisant le passé composé et l'imparfait.",
			modelAnswer:
				"Quand j'étais adolescente, mes parents et moi avons voyagé au Rajasthan. Il faisait très chaud, mais nous avons adoré visiter Jaipur.",
			rubric: [
				'I spoke for about 3 minutes',
				'I used passé composé and imparfait',
				'I gave concrete details',
				'Pronunciation was clear',
				'I handled questions if any'
			]
		}
	]
};
