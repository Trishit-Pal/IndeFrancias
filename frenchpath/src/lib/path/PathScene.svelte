<script lang="ts">
	import type { UnitSummary } from '$lib/content/schema';
	import type { LessonStatus, ProgressRecord } from '$lib/db/schema';
	import PathNode from '$lib/components/PathNode.svelte';

	let {
		units,
		states,
		progressById,
		lockReasons,
		currentUnitId,
		reduceMotion = false
	}: {
		units: UnitSummary[];
		states: Map<string, LessonStatus>;
		progressById: Record<string, ProgressRecord>;
		lockReasons: Map<string, string | null>;
		currentUnitId: string | undefined;
		reduceMotion: boolean;
	} = $props();

	/** CSS perspective path — WebGL ribbon deferred (see docs/ml-roadmap.md#deferred-ui-post-launch). */
	const usePerspective = $derived(!reduceMotion);

	const bands = $derived(
		(['A1', 'A2', 'B1', 'B2', 'C1'] as const)
			.map((level) => ({
				level,
				units: units.filter((u) => u.cefrLevel === level)
			}))
			.filter((b) => b.units.length > 0)
	);
</script>

<div class="fp-path-scene {usePerspective ? 'fp-path-scene--3d' : ''}" data-testid="path-scene">
	{#each bands as band (band.level)}
		<section class="fp-path-band">
			<h3 class="fp-path-band-label">{band.level}</h3>
			<ul class="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
				{#each band.units as unit, i (unit.id)}
					{@const status = states.get(unit.id) ?? 'locked'}
					{@const p = progressById[unit.id]}
					{@const lockReason = lockReasons.get(unit.id)}
					<li
						class="fp-stagger-item relative {usePerspective ? 'fp-path-node-3d' : ''}"
						style="--fp-stagger: {Math.min(i, 8)}"
					>
						{#if i > 0}
							<span class="fp-path-ribbon" aria-hidden="true"></span>
						{/if}
						<PathNode
							title={unit.title}
							cefrLevel={unit.cefrLevel}
							{status}
							score={p?.score}
							highlight={unit.id === currentUnitId}
							lockReason={lockReason ?? 'Complete the previous lesson to unlock.'}
							unitId={status !== 'locked' ? unit.id : undefined}
						/>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style>
	.fp-path-band {
		content-visibility: auto;
		contain-intrinsic-size: auto 24rem;
	}

	.fp-path-scene--3d .fp-path-node-3d {
		transform: perspective(800px) rotateX(2deg);
		transition: transform 200ms ease;
	}

	.fp-path-scene--3d .fp-path-node-3d:hover {
		transform: perspective(800px) rotateX(0deg) translateY(-4px);
	}

	@media (prefers-reduced-motion: reduce) {
		.fp-path-scene--3d .fp-path-node-3d {
			transform: none;
		}
	}
</style>
