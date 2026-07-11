// frenchpath/scripts/emit-version-json.mjs
// Build-time only: writes static/version.json from package.json's version,
// so the opt-in update check (src/lib/platform/updates.ts) has something
// same-origin to fetch. No secrets, no network calls here.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DOWNLOAD_URL = 'https://github.com/Trishit-Pal/IndeFrancias/releases/latest';
const DEST = path.resolve('static/version.json');

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (!pkg.version) throw new Error('package.json missing version field');

const payload = { version: pkg.version, downloadUrl: DOWNLOAD_URL };
await writeFile(DEST, JSON.stringify(payload, null, '\t') + '\n');

console.error(`Wrote ${DEST} (version ${pkg.version})`);
