<script lang="ts">
	import { resolve } from '$app/paths';
	import type { LessonStatus } from '$lib/db/schema';

	let {
		title,
		cefrLevel,
		status,
		score,
		unitId,
		lockReason,
		highlight = false
	}: {
		title: string;
		cefrLevel: string;
		status: LessonStatus;
		score?: number;
		unitId?: string;
		lockReason?: string | null;
		highlight?: boolean;
	} = $props();
</script>

{#if status === 'locked'}
	<div
		class="block cursor-not-allowed rounded-xl border border-border bg-subtle p-4 opacity-60"
		data-testid="unit-card"
		aria-disabled="true"
	>
		<div class="flex items-center justify-between">
			<span class="rounded-full bg-border px-2 py-0.5 text-xs font-semibold text-muted">
				{cefrLevel}
			</span>
			<span class="text-sm text-muted">🔒 Locked</span>
		</div>
		<h3 class="mt-2 font-semibold text-muted">{title}</h3>
		{#if lockReason}
			<p class="mt-1 text-sm text-muted">{lockReason}</p>
		{/if}
	</div>
{:else if unitId}
	<a
		href={resolve('/learn/[unitId]', { unitId })}
		class="surface-card fp-unit-card block p-4 transition hover:border-primary hover:shadow-sm {highlight
			? 'fp-path-glow border-primary'
			: ''}"
		data-testid="unit-card"
	>
		<div class="flex items-center justify-between">
			<span class="rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold text-muted">
				{cefrLevel}
			</span>
			{#if status === 'completed'}
				<span class="text-sm font-medium text-green-600 dark:text-green-400">✓ {score ?? 0}%</span>
			{:else}
				<span class="text-sm font-medium text-primary">Start →</span>
			{/if}
		</div>
		<h3 class="mt-2 font-semibold text-foreground">{title}</h3>
	</a>
{/if}
