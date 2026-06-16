<!-- CharacterMira.svelte — Mira, the Hindi-speaking fox guide -->
<!-- Usage: <CharacterMira size="md" animate /> -->
<script lang="ts">
	let {
		size = 'md',
		animate = true,
		class: cls = ''
	}: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; animate?: boolean; class?: string } = $props();
</script>

<div
	class="fp-char fp-char--mira fp-char--{size} {animate ? 'fp-bob' : ''} {cls}"
	aria-hidden="true"
>
	<div class="fp-ear-l"></div>
	<div class="fp-ear-r"></div>
	<div class="fp-head"></div>
	<div class="fp-snout"></div>
	<div class="fp-eye-l fp-blink"></div>
	<div class="fp-eye-r fp-blink"></div>
	<div class="fp-nose"></div>
	<div class="fp-bindi"></div>
</div>
