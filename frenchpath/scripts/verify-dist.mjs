// frenchpath/scripts/verify-dist.mjs
// Build-output guard, run after `npm run build`: fails loudly if the shipped
// bundle is missing the bundled ASR model or version.json, or if the model
// leaked into the service worker's precache (defeating the opt-in web
// download from Task 8/10 — the model must stay same-origin but out of the
// app-shell cache).
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Plain `node` (no tsx/loader) runs this on CI's Node 22, which can't import
// .ts directly — read the manifest as text and regex out the constant,
// matching the convention already used by fetch-vosk-model.mjs.
const manifestSrc = await readFile('src/lib/speech/modelManifest.ts', 'utf8');
const MODEL_FILENAME = manifestSrc.match(/MODEL_FILENAME = '([^']+)'/)?.[1];
if (!MODEL_FILENAME) fail('could not read MODEL_FILENAME from modelManifest.ts');

const BUILD_DIR = path.resolve('build');

function fail(message) {
	console.error(`verify-dist: FAILED — ${message}`);
	process.exit(1);
}

async function fileExists(filePath) {
	return access(filePath).then(
		() => true,
		() => false
	);
}

// (a) the bundled ASR model must be present
const modelPath = path.join(BUILD_DIR, 'models', MODEL_FILENAME);
if (!(await fileExists(modelPath))) {
	fail(`missing bundled model at build/models/${MODEL_FILENAME}`);
}

// (b) the model must NOT leak into the service worker's precache
const swFiles = (await readdir(BUILD_DIR)).filter(
	(name) => /^(sw|workbox-.*)\.js$/.test(name) // skip .br/.gz — same content, plain text is enough
);
if (swFiles.length === 0) fail('no service worker output (sw.js / workbox-*.js) found in build/');

for (const name of swFiles) {
	const contents = await readFile(path.join(BUILD_DIR, name), 'utf8');
	if (contents.includes(MODEL_FILENAME)) {
		fail(`model filename "${MODEL_FILENAME}" leaked into service worker precache (${name})`);
	}
	// version.json must never be precached — checkForUpdate() needs a live
	// network fetch to detect a newer deployment (see src/lib/platform/updates.ts).
	// A precached copy would always compare equal to the running version.
	if (contents.includes('version.json')) {
		fail(`"version.json" leaked into service worker precache (${name})`);
	}
}

// (c) version.json must be present
if (!(await fileExists(path.join(BUILD_DIR, 'version.json')))) {
	fail('missing build/version.json');
}

console.error('verify-dist: OK — model, version.json present; SW precache clean');
