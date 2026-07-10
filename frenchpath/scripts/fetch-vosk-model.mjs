// frenchpath/scripts/fetch-vosk-model.mjs
// Build-time only (invariant 2): downloads the pinned Vosk French model into
// static/models/ (gitignored). Verifies SHA-256; refuses a mismatched artifact.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const MODEL_FILENAME = 'vosk-model-small-fr-0.22.zip';
const UPSTREAM = `https://alphacephei.com/vosk/models/${MODEL_FILENAME}`;
const DEST_DIR = path.resolve('static/models');
const DEST = path.join(DEST_DIR, MODEL_FILENAME);
const printHash = process.argv.includes('--print-hash');

const manifest = await readFile('src/lib/speech/modelManifest.ts', 'utf8');
const pinned = manifest.match(/MODEL_SHA256 = '([a-f0-9]{64}|FILL_ME_IN_STEP_3)'/)?.[1];
if (!pinned) throw new Error('modelManifest.ts missing MODEL_SHA256');

const exists = await access(DEST).then(
	() => true,
	() => false
);
let bytes;
let wasDownloaded = false;

if (exists) {
	bytes = await readFile(DEST);
} else {
	console.error(`Downloading ${UPSTREAM} ...`);
	const res = await fetch(UPSTREAM);
	if (!res.ok) throw new Error(`Model download failed: HTTP ${res.status}`);
	bytes = Buffer.from(await res.arrayBuffer());
	wasDownloaded = true;
}

// Compute hash BEFORE writing to disk
const hash = createHash('sha256').update(bytes).digest('hex');

if (printHash) {
	// Print-hash mode: write file and print hash
	await mkdir(DEST_DIR, { recursive: true });
	await writeFile(DEST, bytes);
	console.log(hash);
} else if (pinned !== hash) {
	// Hash mismatch: refuse without writing to disk
	throw new Error(`Model hash mismatch: pinned ${pinned}, got ${hash}. Refusing.`);
} else if (wasDownloaded) {
	// Hash matches and we just downloaded it: write to disk now
	await mkdir(DEST_DIR, { recursive: true });
	await writeFile(DEST, bytes);
}

console.error(`Model OK at ${DEST}`);
