<!-- CharacterCoco.svelte — Coco, the kitten companion -->
<!-- Usage: <CharacterCoco size="md" animate level={5} /> -->
<script lang="ts">
	let {
		size = 'md',
		animate = true,
		level = 1,
		class: cls = ''
	}: {
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		animate?: boolean;
		level?: number;
		class?: string;
	} = $props();
	const isChef = $derived(level >= 5);
</script>

<div
	class="fp-char fp-char--coco fp-char--{size} {animate ? 'fp-bob' : ''} {cls}"
	aria-hidden="true"
>
	{#if isChef}<div class="fp-chef-hat"></div>{/if}
	<div class="fp-ear-l"></div>
	<div class="fp-ear-r"></div>
	<div class="fp-ear-inner-l"></div>
	<div class="fp-ear-inner-r"></div>
	<div class="fp-head"></div>
	<div class="fp-eye-l fp-blink"></div>
	<div class="fp-eye-r fp-blink"></div>
	<div class="fp-nose"></div>
	<div class="fp-whisker-l-t"></div>
	<div class="fp-whisker-r-t"></div>
	<div class="fp-whisker-l-b"></div>
	<div class="fp-whisker-r-b"></div>
</div>
