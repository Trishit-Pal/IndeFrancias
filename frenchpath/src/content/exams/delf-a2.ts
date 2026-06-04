// Mock DELF A2 exam: four skills, each scored out of 25. Listening & reading
// are auto-graded; writing & speaking are self-assessed against a rubric.
import type { MockExam } from '$lib/exam/types';

export const DELF_A2: MockExam = {
	id: 'delf-a2',
	title: 'Mock DELF A2',
	level: 'A2',
	sections: [
		{
			skill: 'listening',
			title: 'Compréhension de l’oral',
			instructions: 'Listen to each sentence (🔊) and type exactly what you hear.',
			items: [
				{
					type: 'dictation',
					id: 'delf-a2-l1',
					audioText: 'Hier, Priya a visité un temple à Jaipur.',
					answer: 'Hier, Priya a visité un temple à Jaipur.',
					accept: ['hier priya a visite un temple a jaipur'],
					hint: 'A past-tense sentence about Priya.'
				},
				{
					type: 'dictation',
					id: 'delf-a2-l2',
					audioText: 'Nous allons au marché à dix heures.',
					answer: 'Nous allons au marché à dix heures.',
					accept: ['nous allons au marche a dix heures'],
					hint: 'A plan with a time.'
				}
			]
		},
		{
			skill: 'reading',
			title: 'Compréhension des écrits',
			instructions: 'Read and answer.',
			items: [
				{
					type: 'mcq',
					id: 'delf-a2-r1',
					prompt:
						'« La semaine dernière, Arjun a acheté un cadeau pour sa sœur. » When did Arjun buy the gift?',
					options: ['Last week', 'Tomorrow', 'Every Monday', 'At noon'],
					answerIndex: 0,
					explanation: '« La semaine dernière » = last week.'
				},
				{
					type: 'cloze',
					id: 'delf-a2-r2',
					text: 'Complete the past tense: « Nous avons {{}} le Taj Mahal. » (visiter)',
					answer: 'visité',
					accept: ['visite', 'visité'],
					hint: 'Past participle of visiter.'
				}
			]
		},
		{
			skill: 'writing',
			title: 'Production écrite',
			instructions: 'Write ~40 words, then self-assess honestly against the checklist.',
			prompt:
				'Écrivez un court message à un ami : qu’avez-vous fait le week-end dernier ? (Use the passé composé and an Indian context.)',
			modelAnswer:
				'Salut ! Le week-end dernier, je suis allé à Goa avec ma famille. Nous avons visité la plage et j’ai mangé du poisson. C’était super ! À bientôt, Arjun.',
			rubric: [
				'I wrote at least 40 words',
				'I used the passé composé correctly',
				'I described a real past activity',
				'My spelling and accents are mostly correct',
				'The message reads naturally to a friend'
			]
		},
		{
			skill: 'speaking',
			title: 'Production orale',
			instructions: 'Record yourself (or speak aloud) for ~1 minute, then self-assess.',
			prompt:
				'Présentez votre famille : qui sont-ils, où habitent-ils, que font-ils ? (Parlez pendant une minute.)',
			modelAnswer:
				'Je m’appelle Priya. Dans ma famille, il y a mon père, ma mère et mon frère. Mes parents habitent à Chennai. Mon père travaille dans une banque et ma mère est professeure. J’aime ma famille.',
			rubric: [
				'I spoke for about a minute',
				'I introduced each family member',
				'I used possessives (mon/ma/mes)',
				'I used present-tense verbs correctly',
				'My pronunciation was understandable'
			]
		}
	]
};
