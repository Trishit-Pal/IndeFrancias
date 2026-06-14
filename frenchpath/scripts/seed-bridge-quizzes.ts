/**
 * Adds bridge.quiz MCQ to each unit pack (idempotent).
 *   npx tsx scripts/seed-bridge-quizzes.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { unitSchema, type Unit } from '../src/lib/content/schema';

const PACKS_DIR = resolve('src/content/packs');

function packFiles(): string[] {
	return readdirSync(PACKS_DIR, { recursive: true })
		.map(String)
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(PACKS_DIR, f));
}

function quizForUnit(unit: Unit) {
	const topic = unit.bridge?.title?.split(':').pop()?.trim() ?? unit.title;
	return {
		prompt: `What is the main bridge idea for "${unit.title}"?`,
		options: [
			`Focus on: ${topic.slice(0, 60)}`,
			'Ignore grammar gender entirely',
			'Only practise numbers, never verbs'
		],
		answerIndex: 0
	};
}

function main() {
	let updated = 0;
	for (const file of packFiles()) {
		const raw = JSON.parse(readFileSync(file, 'utf8'));
		const parsed = unitSchema.safeParse(raw);
		if (!parsed.success || !parsed.data.bridge) continue;
		if (parsed.data.bridge.quiz) continue;
		const out: Unit = {
			...parsed.data,
			bridge: { ...parsed.data.bridge, quiz: quizForUnit(parsed.data) }
		};
		writeFileSync(file, JSON.stringify(out, null, '\t') + '\n', 'utf8');
		updated += 1;
	}
	console.log(`Added bridge.quiz to ${updated} pack(s).`);
}

main();
