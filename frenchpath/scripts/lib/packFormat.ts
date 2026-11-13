/**
 * Writes a pack back in the project's Prettier style while touching only what changed.
 * Prettier keeps an object expanded only if the input had a newline after its `{`, so the
 * layout (inline vs expanded objects) of the ORIGINAL file is carried into the text we hand it.
 */
import { format, resolveConfig, type ParserOptions } from 'prettier';
import * as babel from 'prettier/plugins/babel';

interface AstNode {
	type: string;
	start: number;
	properties?: { start: number; key: { value: string }; value: AstNode }[];
	elements?: AstNode[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

function wasInline(node: AstNode | undefined, source: string): boolean {
	const first = node?.properties?.[0];
	return !!node && !!first && !source.slice(node.start, first.start).includes('\n');
}

function emit(value: unknown, node: AstNode | undefined, source: string): string {
	if (Array.isArray(value)) {
		return `[${value.map((v, i) => emit(v, node?.elements?.[i], source)).join(',')}]`;
	}
	if (!isRecord(value)) return JSON.stringify(value);
	const props = Object.entries(value).map(([k, v]) => {
		const child = node?.properties?.find((p) => p.key.value === k)?.value;
		return `${JSON.stringify(k)}:${emit(v, child, source)}`;
	});
	return wasInline(node, source) ? `{${props.join(',')}}` : `{\n${props.join(',\n')}\n}`;
}

/** Format `updated` as Prettier would, keeping the object layout `source` already had. */
export async function formatLikeSource(
	file: string,
	source: string,
	updated: unknown
): Promise<string> {
	const root = babel.parsers.json.parse(source, {} as ParserOptions) as { node: AstNode };
	const config = await resolveConfig(file);
	return format(emit(updated, root.node, source), { ...config, parser: 'json', filepath: file });
}
