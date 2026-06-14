<script lang="ts">
	import { parseInlineMarkdownSegments } from '$lib/content/markdownSegments';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from './GlossText.svelte';

	let {
		text,
		lexicon,
		class: className = ''
	}: {
		text: string;
		lexicon: Lexicon;
		class?: string;
	} = $props();

	const segments = $derived(parseInlineMarkdownSegments(text));
</script>

<span class={className} data-testid="gloss-markdown">
	{#each segments as segment, i (i)}
		{#if segment.kind === 'break'}
			<br />
		{:else if segment.kind === 'strong'}
			<strong><GlossText text={segment.content} {lexicon} class="inline" /></strong>
		{:else if segment.kind === 'em'}
			<em><GlossText text={segment.content} {lexicon} class="inline" /></em>
		{:else}
			<GlossText text={segment.content} {lexicon} class="inline" />
		{/if}
	{/each}
</span>
