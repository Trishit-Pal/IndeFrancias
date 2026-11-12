import { describe, expect, it } from 'vitest';
import { formatLikeSource } from '../../../scripts/lib/packFormat';

const FILE = 'src/content/packs/a1/unit-test.json';

describe('formatLikeSource', () => {
	it('keeps an inline object inline', async () => {
		const source =
			'{\n\t"pairs": [\n\t\t{ "left": "a", "right": "b" },\n\t\t{ "left": "c", "right": "d" }\n\t]\n}\n';
		expect(await formatLikeSource(FILE, source, JSON.parse(source))).toBe(source);
	});

	it('keeps an expanded object expanded', async () => {
		const source = '{\n\t"pair": {\n\t\t"left": "a",\n\t\t"right": "b"\n\t}\n}\n';
		expect(await formatLikeSource(FILE, source, JSON.parse(source))).toBe(source);
	});

	it('appends a new key to an expanded object and changes nothing else', async () => {
		const source =
			'{\n\t"glosses": {\n\t\t"hi": "a",\n\t\t"en": "b"\n\t},\n\t"pair": { "x": 1 }\n}\n';
		const updated = JSON.parse(source);
		updated.glosses.ml = 'c';
		expect(await formatLikeSource(FILE, source, updated)).toBe(
			'{\n\t"glosses": {\n\t\t"hi": "a",\n\t\t"en": "b",\n\t\t"ml": "c"\n\t},\n\t"pair": { "x": 1 }\n}\n'
		);
	});

	it('expands an object that is absent from the source', async () => {
		const source = '{\n\t"a": 1\n}\n';
		expect(await formatLikeSource(FILE, source, { a: 1, added: { k: 'v' } })).toBe(
			'{\n\t"a": 1,\n\t"added": {\n\t\t"k": "v"\n\t}\n}\n'
		);
	});
});
