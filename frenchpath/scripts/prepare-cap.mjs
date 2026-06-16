// Capacitor needs an `index.html` entry; adapter-static emits the SPA shell as
// `200.html`. Copy it so `cap sync` (webDir: 'build') has a valid entry, without
// changing the hardened web build. Run via `npm run build:cap`.
import { copyFileSync, existsSync } from 'node:fs';

const shell = 'build/200.html';
const entry = 'build/index.html';

if (!existsSync(shell)) {
	console.error(`prepare-cap: ${shell} not found — run \`npm run build\` first.`);
	process.exit(1);
}
copyFileSync(shell, entry);
console.log(`prepare-cap: wrote ${entry} from ${shell}`);
