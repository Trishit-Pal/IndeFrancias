<script lang="ts">
	import {
		lookupLexicon,
		normalizeFrenchToken,
		tokenizeFrench,
		type Lexicon
	} from '$lib/content/lexicon';
	import GlossPopover from './GlossPopover.svelte';

	let {
		text,
		lexicon,
		class: className = '',
		frenchOnly = true,
		forceGlossWords = []
	}: {
		text: string;
		lexicon: Lexicon;
		class?: string;
		/** When false, render plain text (for English prompts). */
		frenchOnly?: boolean;
		/** Normalised French tokens that should always be tappable. */
		forceGlossWords?: string[];
	} = $props();

	let activeWord = $state<string | null>(null);
	let anchorRect = $state<DOMRect | null>(null);

	const tokens = $derived(tokenizeFrench(text));

	const forced = $derived(
		new Set(forceGlossWords.map((w) => normalizeFrenchToken(w)).filter(Boolean))
	);

	function isGlossable(word: string): boolean {
		if (!frenchOnly) return false;
		const norm = normalizeFrenchToken(word);
		return forced.has(norm) || lookupLexicon(lexicon, word) !== null || /[\p{L}]/u.test(word);
	}

	function openWord(word: string, el: HTMLElement) {
		activeWord = word;
		anchorRect = el.getBoundingClientRect();
	}

	function closePopover() {
		activeWord = null;
		anchorRect = null;
	}

	const activeEntry = $derived(activeWord ? lookupLexicon(lexicon, activeWord) : null);

	$effect(() => {
		if (!activeWord) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closePopover();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<span class={className}>
	{#each tokens as token, i (i)}
		{#if token.type === 'space'}
			{token.value}
		{:else if token.type === 'punct'}
			{token.value}
		{:else if isGlossable(token.value)}
			<button
				type="button"
				class="fp-gloss-word font-inherit inline rounded px-0.5 text-inherit underline decoration-primary/50 decoration-dotted underline-offset-2 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
				aria-haspopup="dialog"
				data-testid="gloss-word"
				onclick={(e) => openWord(token.value, e.currentTarget)}
			>
				{token.value}
			</button>
		{:else}
			{token.value}
		{/if}
	{/each}
</span>

{#if activeWord && anchorRect}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		onclick={closePopover}
		onkeydown={(e) => e.key === 'Escape' && closePopover()}
	></div>
	<div
		class="fixed z-50"
		style:left="{Math.min(
			anchorRect.left,
			typeof window !== 'undefined' ? window.innerWidth - 280 : anchorRect.left
		)}px"
		style:top="{anchorRect.bottom + 8}px"
	>
		<GlossPopover entry={activeEntry} unknownWord={activeWord} onclose={closePopover} />
	</div>
{/if}
