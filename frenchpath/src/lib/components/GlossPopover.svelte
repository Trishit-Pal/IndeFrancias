<script lang="ts">
	import type { LexiconEntry } from '$lib/content/lexicon';
	import { speakFrench, ttsAvailable } from '$lib/audio/tts';
	import * as m from '$lib/paraglide/messages';

	let {
		entry,
		unknownWord = '',
		onclose
	}: {
		entry: LexiconEntry | null;
		unknownWord?: string;
		onclose: () => void;
	} = $props();

	let popoverEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		popoverEl?.focus();
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function listen() {
		const text = entry?.french ?? unknownWord;
		if (text) speakFrench(text);
	}
</script>

<div
	bind:this={popoverEl}
	class="fp-gloss-popover surface-card fp-neon-border z-50 max-w-xs min-w-[12rem] p-3 shadow-lg"
	role="dialog"
	aria-label={entry?.french ?? unknownWord}
	tabindex="-1"
	onkeydown={onKeydown}
	data-testid="gloss-popover"
>
	{#if entry}
		<div class="flex items-start justify-between gap-2">
			<div>
				<p class="text-lg font-semibold text-foreground">{entry.french}</p>
				{#if entry.gender !== 'none'}
					<span class="mt-1 inline-block rounded-full bg-subtle px-2 py-0.5 text-xs text-muted">
						{entry.gender}
					</span>
				{/if}
				{#if entry.ipa}
					<p class="mt-1 font-mono text-xs text-muted">/{entry.ipa}/</p>
				{/if}
			</div>
			<button
				type="button"
				class="min-h-11 min-w-11 rounded-full border border-border text-lg hover:border-primary"
				aria-label={m.gloss_close()}
				onclick={onclose}
			>
				×
			</button>
		</div>
		<p class="mt-2 text-base text-foreground">{entry.gloss.primary}</p>
		{#if entry.gloss.secondary}
			<p class="mt-1 text-sm text-muted">{entry.gloss.secondary}</p>
		{/if}
	{:else}
		<p class="font-semibold text-foreground">{unknownWord}</p>
		<p class="mt-1 text-sm text-muted">{m.gloss_unknown()}</p>
	{/if}

	<div class="mt-3 flex gap-2">
		{#if ttsAvailable()}
			<button type="button" class="btn-secondary min-h-11 flex-1 text-sm" onclick={listen}>
				🔊 {m.gloss_listen()}
			</button>
		{/if}
	</div>
</div>
