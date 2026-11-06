<!-- LeechRescue.svelte — (section + aria-labelledby is a region) one-time teaching panel before a card the learner keeps
     forgetting. Not graded; the example is shown in full on purpose (teaching moment). -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import IconButton from '$lib/components/IconButton.svelte';
	import { speakFrench } from '$lib/audio/tts';
	import type { Card } from '$lib/content/schema';

	interface Props {
		content: Card;
		/** Gloss of the example sentence in the learner's language. */
		exampleGloss?: string;
		canSpeak: boolean;
		onDone: () => void;
	}
	let { content, exampleGloss = '', canSpeak, onDone }: Props = $props();

	const forms = $derived((content.forms ?? []).slice(0, 4));
	const example = $derived(content.example?.french ?? '');
	let gotIt = $state<HTMLButtonElement>();

	onMount(() => gotIt?.focus());

	function speak() {
		try {
			speakFrench(example || content.french);
		} catch {
			// a failing voice just stays silent
		}
	}
</script>

<section
	class="surface-card p-6 shadow-sm lg:mx-auto lg:max-w-2xl"
	aria-labelledby="leech-title"
	data-testid="leech-rescue"
>
	<h1 class="fp-display-md text-balance text-foreground" id="leech-title">{m.leech_title()}</h1>
	<p class="mt-1 text-muted">{m.leech_body()}</p>

	<div class="mt-4 flex items-center gap-2">
		<p class="fp-display-lg text-balance text-foreground" lang="fr">{content.french}</p>
		{#if canSpeak}
			<IconButton icon="speaker" label={m.review_listen_replay()} onclick={speak} />
		{/if}
	</div>
	{#if content.gender !== 'none'}
		<p class="mt-1 text-sm text-muted">{content.gender}</p>
	{/if}
	{#if forms.length > 0}
		<ul class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground" lang="fr">
			{#each forms as form (form)}<li>{form}</li>{/each}
		</ul>
	{/if}
	{#if content.fauxAmi}
		<p class="mt-3 text-sm" style="color: var(--fp-saffron-text)">{m.leech_faux_ami()}</p>
	{/if}
	{#if example}
		<div class="mt-4 border-t border-border pt-4">
			<p class="text-foreground italic" lang="fr">{example}</p>
			{#if exampleGloss}
				<p class="mt-1 text-sm text-muted" style="font-family: var(--fp-font-hindi)">
					{exampleGloss}
				</p>
			{/if}
		</div>
	{/if}

	<button
		bind:this={gotIt}
		type="button"
		class="btn-primary mt-5 min-h-11 w-full"
		data-testid="leech-got-it"
		onclick={onDone}>{m.leech_got_it()}</button
	>
</section>
