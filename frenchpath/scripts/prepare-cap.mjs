// Capacitor and Tauri need an `index.html` SPA entry; adapter-static emits the SPA shell as
// `200.html` and a prerendered Home as `index.html`. Both native shells serve `index.html` for any
// unknown path, so a full reload of /learn/[unitId] would boot Home. Copy the shell over it.
// Run by `npm run build:cap` and by Tauri's beforeBuildCommand (src-tauri/tauri.conf.json).
// ponytail: rewrites build/ in place, so build/ is native-flavoured afterwards; the web deploy
// (vercel-build) always runs a fresh `npm run build`, which restores the prerendered Home.
import { copyFileSync, existsSync } from 'node:fs';

const shell = 'build/200.html';
const entry = 'build/index.html';

if (!existsSync(shell)) {
	console.error(`prepare-cap: ${shell} not found — run \`npm run build\` first.`);
	process.exit(1);
}
copyFileSync(shell, entry);
console.log(`prepare-cap: wrote ${entry} from ${shell}`);
