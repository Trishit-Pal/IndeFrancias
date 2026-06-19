import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)); // frenchpath/scripts
const frenchpathRoot = resolve(here, '..'); // frenchpath/
const repoRoot = resolve(frenchpathRoot, '..'); // repo root
const specPath = join(repoRoot, 'docs', 'spec', 'SPEC.md');
const specDir = dirname(specPath);

const REQUIRED_SECTIONS = [
	'## §1 Vision & positioning',
	'## §2 Personas, JTBD & decision rule',
	'## §3 Invariants (the constitution)',
	'## §4 Capability Map',
	'## §5 Architecture overview',
	'## §6 Domain module index',
	'## §7 Decision log (ADR index)',
	'## §8 Roadmap & milestones',
	'## §9 Glossary',
	'## §10 Spec maintenance protocol',
	'## §11 Revision log'
];

const errors: string[] = [];
const spec = readFileSync(specPath, 'utf8');

// 1. Required sections present
for (const s of REQUIRED_SECTIONS) {
	if (!spec.includes(s)) errors.push(`Missing section heading: ${s}`);
}

// 2. Capability "Key file" anchors resolve (paths in `frenchpath/...` backticks)
const fileAnchors = [...spec.matchAll(/`(frenchpath\/[^`]+)`/g)].map((m) => m[1]);
for (const rel of [...new Set(fileAnchors)]) {
	if (!existsSync(join(repoRoot, rel))) errors.push(`Capability Key file does not exist: ${rel}`);
}

// 3. Relative markdown links resolve (../ or ./ targets, relative to docs/spec/)
const links = [...spec.matchAll(/\]\((\.\.?\/[^)#]+)(?:#[^)]*)?\)/g)].map((m) => m[1]);
for (const link of [...new Set(links)]) {
	if (!existsSync(resolve(specDir, link))) errors.push(`Broken appendix link: ${link}`);
}

if (errors.length) {
	console.error(`spec:validate FAILED (${errors.length})`);
	for (const e of errors) console.error('  - ' + e);
	process.exit(1);
}
console.log(
	`spec:validate OK — ${REQUIRED_SECTIONS.length} sections, ${new Set(fileAnchors).size} file anchors, ${new Set(links).size} links verified`
);
