<!-- CelebrationScene.svelte — the "full" celebration: Coco under falling     -->
<!-- confetti. Pure CSS (the existing character + the fp-confetti keyframes); -->
<!-- it replaced a Three.js canvas that precached a 3D engine to draw three   -->
<!-- primitives. Only rendered when motion is allowed (see the overlay).      -->
<script lang="ts">
	import CharacterCoco from '$lib/components/CharacterCoco.svelte';

	let { clip = 'cheer' }: { clip?: string } = $props();

	const CONFETTI_COLORS = ['--fp-saffron', '--fp-jaipur', '--fp-seine', '--fp-sage'];
	const CONFETTI_COUNT = 14;
	// Deterministic scatter (no Math.random: stable across re-renders).
	const pieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
		left: (i * 37 + 11) % 100,
		delay: ((i * 53) % 18) / 10,
		color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
	}));
</script>

<div class="fp-celebration-scene" aria-hidden="true">
	{#each pieces as piece, i (i)}
		<span
			class="fp-confetti-piece"
			style="left:{piece.left}%; animation-delay:{piece.delay}s; background:var({piece.color})"
		></span>
	{/each}
	<!-- Milestones ("dance") get Coco's chef hat. -->
	<CharacterCoco size="lg" animate level={clip === 'dance' ? 5 : 1} />
</div>

<style>
	.fp-celebration-scene {
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		height: 12rem;
		overflow: hidden;
	}
	.fp-confetti-piece {
		position: absolute;
		top: 0;
		width: 8px;
		height: 12px;
		border-radius: 2px;
		opacity: 0;
		animation: fp-confetti 2.4s linear infinite;
	}
</style>
