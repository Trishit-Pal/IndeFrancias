/**
 * Export the gloss worklist and merge translator draft files into the lesson packs.
 *
 *   npx tsx scripts/gloss-drafts.ts --export <out-file.json>
 *   npx tsx scripts/gloss-drafts.ts --apply <lang> [--check]
 *
 * See scripts/gloss-drafts/README.md.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { unitSchema } from '../src/lib/content/schema';
import { LANGUAGES } from '../src/lib/i18n/languages';
import { isDerivedGlossLang } from './lib/regionalGloss';
import { applyGlossDrafts, listGlossItems } from './lib/glossDrafts';
import { formatLikeSource } from './lib/packFormat';

const PACKS_DIR = resolve('src/content/packs');
const DRAFTS_DIR = resolve('scripts/gloss-drafts');
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'];

function packFiles(): string[] {
	return LEVELS.flatMap((level) =>
		readdirSync(join(PACKS_DIR, level))
			.filter((f) => f.endsWith('.json'))
			.sort()
			.map((f) => join(PACKS_DIR, level, f))
	);
}

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

function fail(lines: string[]): never {
	for (const line of lines) console.error(line);
	process.exit(1);
}

function exportWorklist(outFile: string): void {
	const worklist: Record<string, { fr: string; en: string; hi: string }> = {};
	for (const file of packFiles()) {
		for (const { key, fr, en, hi } of listGlossItems(readJson(file)))
			worklist[key] = { fr, en, hi };
	}
	mkdirSync(dirname(resolve(outFile)), { recursive: true });
	writeFileSync(resolve(outFile), JSON.stringify(worklist, null, 2) + '\n');
	console.log(`exported ${Object.keys(worklist).length} gloss items to ${outFile}`);
}

function readDrafts(lang: string): Record<string, string> {
	const file = join(DRAFTS_DIR, `${lang}.json`);
	let raw: unknown;
	try {
		raw = readJson(file);
	} catch (e: unknown) {
		fail([`cannot read ${file}: ${e instanceof Error ? e.message : String(e)}`]);
	}
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		fail([`${file}: expected a flat { "<key>": "<gloss>" } object`]);
	}
	const bad = Object.entries(raw).filter(([, v]) => typeof v !== 'string');
	if (bad.length) fail(bad.map(([k]) => `${file}: draft is not a string: ${k}`));
	return raw as Record<string, string>;
}

async function applyDrafts(lang: string, checkOnly: boolean): Promise<void> {
	if (!Object.hasOwn(LANGUAGES, lang)) {
		fail([`unknown language "${lang}" (known: ${Object.keys(LANGUAGES).join(', ')})`]);
	}
	if (isDerivedGlossLang(lang)) {
		fail([
			`"${lang}" is derived from Hindi/English by the gloss scripts; drafts are only for other languages`
		]);
	}
	const drafts = readDrafts(lang);
	const script = LANGUAGES[lang as keyof typeof LANGUAGES].script;
	const problems: string[] = [];
	const seen = new Set<string>();
	const updated: { file: string; unit: unknown }[] = [];
	let applied = 0;

	for (const file of packFiles()) {
		const unit = readJson(file);
		for (const item of listGlossItems(unit)) seen.add(item.key);
		const result = applyGlossDrafts(unit, lang, drafts, script);
		problems.push(...result.problems.map((p) => `${p} (${file})`));
		if (!unitSchema.safeParse(result.unit).success) problems.push(`invalid unit schema: ${file}`);
		applied += result.applied;
		updated.push({ file, unit: result.unit });
	}
	for (const key of Object.keys(drafts)) {
		if (!seen.has(key)) problems.push(`unknown draft key: ${key}`);
	}
	if (problems.length) fail([...problems, `${problems.length} problem(s); nothing written`]);

	if (!checkOnly) {
		for (const { file, unit } of updated) {
			const text = await formatLikeSource(file, readFileSync(file, 'utf8'), unit);
			writeFileSync(file, text);
		}
	}
	console.log(
		`applied ${applied} glosses to ${updated.length} units${checkOnly ? ' (check only)' : ''}`
	);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const exportAt = args.indexOf('--export');
	const applyAt = args.indexOf('--apply');
	if (exportAt >= 0 && args[exportAt + 1]) return exportWorklist(args[exportAt + 1]);
	if (applyAt >= 0 && args[applyAt + 1])
		return applyDrafts(args[applyAt + 1], args.includes('--check'));
	fail(['usage: gloss-drafts.ts --export <out-file.json> | --apply <lang> [--check]']);
}

void main();
