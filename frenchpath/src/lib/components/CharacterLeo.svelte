<!-- CharacterLeo.svelte — Léo, the Parisian sparrow -->
<!-- Usage: <CharacterLeo size="md" animate /> -->
<script lang="ts">
	let {
		size = 'md',
		animate = true,
		class: cls = ''
	}: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; animate?: boolean; class?: string } = $props();
</script>

<div
	class="fp-char fp-char--leo fp-char--{size} {animate ? 'fp-flutter' : ''} {cls}"
	aria-hidden="true"
>
	<div class="fp-beret"></div>
	<div class="fp-beret-pom"></div>
	<div class="fp-head"></div>
	<div class="fp-belly"></div>
	<div class="fp-eye-l fp-blink"></div>
	<div class="fp-eye-r fp-blink"></div>
	<div class="fp-beak"></div>
	<div class="fp-tail"></div>
</div>
