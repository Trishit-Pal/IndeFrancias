// Lazily loads + validates content packs. Each unit JSON is a separate Vite
// chunk (code-split, precached by the service worker), so units load on demand
// yet work fully offline. The small manifest is bundled eagerly for the path map.
import { manifestSchema, unitSchema, type Manifest, type Unit } from './schema';
import { buildLexicon, type Lexicon } from './lexicon';
import type { NativeLanguage } from '$lib/db/schema';
import manifestData from '../../content/manifest.json';

const unitModules = import.meta.glob('/src/content/packs/**/*.json');

/** `/src/content/packs/a1/unit-01.json` -> `a1-unit-01` */
function pathToUnitId(path: string): string {
	const match = path.match(/packs\/(.+)\.json$/);
	return (match ? match[1] : path).replace(/\//g, '-');
}

const idToLoader = new Map<string, () => Promise<unknown>>();
for (const [path, loader] of Object.entries(unitModules)) {
	idToLoader.set(pathToUnitId(path), loader);
}

let cachedManifest: Manifest | null = null;

/** Validated unit summaries, sorted by CEFR level then order. */
export function listUnitSummaries(): Manifest {
	if (!cachedManifest) cachedManifest = manifestSchema.parse(manifestData);
	return [...cachedManifest].sort((a, b) =>
		a.cefrLevel === b.cefrLevel ? a.order - b.order : a.cefrLevel.localeCompare(b.cefrLevel)
	);
}

const unitCache = new Map<string, Unit>();

/** Loads, validates (zod), and caches a full unit by id. */
export async function loadUnit(unitId: string): Promise<Unit> {
	const cached = unitCache.get(unitId);
	if (cached) return cached;

	const loader = idToLoader.get(unitId);
	if (!loader) throw new Error(`Unknown unit: ${unitId}`);

	const mod = (await loader()) as { default: unknown };
	const unit = unitSchema.parse(mod.default);
	unitCache.set(unitId, unit);
	return unit;
}

/** Cumulative vocabulary lookup for tap-to-gloss (current unit + all prior units). */
export async function buildLessonLexicon(
	unitId: string,
	nativeLanguage: NativeLanguage
): Promise<Lexicon> {
	const summaries = listUnitSummaries();
	const idx = summaries.findIndex((u) => u.id === unitId);
	if (idx < 0) return buildLexicon([], nativeLanguage);

	const prior = summaries.slice(0, idx + 1);
	const units = await Promise.all(prior.map((summary) => loadUnit(summary.id)));
	const cards = units.flatMap((unit) => unit.cards);
	return buildLexicon(cards, nativeLanguage);
}

/** Lexicon from explicit unit ids (checkpoints, exams). */
export async function buildLexiconForUnits(
	unitIds: string[],
	nativeLanguage: NativeLanguage
): Promise<Lexicon> {
	const units = await Promise.all(unitIds.map((id) => loadUnit(id)));
	const cards = units.flatMap((unit) => unit.cards);
	return buildLexicon(cards, nativeLanguage);
}
