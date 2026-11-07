<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import IconButton from './IconButton.svelte';

	let {
		progress,
		current,
		total,
		onExit = undefined,
		children
	}: {
		progress: number;
		current: number;
		total: number;
		/** Rendered as a close control in the header; the caller decides whether to confirm. */
		onExit?: () => void;
		children: import('svelte').Snippet;
	} = $props();
</script>

<div class="fp-lesson-shell">
	<div class="mb-4 flex items-center gap-4">
		{#if onExit}
			<IconButton icon="close" label={m.lesson_exit()} testid="lesson-exit" onclick={onExit} />
		{/if}
		<!-- One progress indicator: the bar, named by the "Exercise n of m" line. -->
		<div class="flex-1">
			<p id="lesson-progress-label" class="text-sm font-medium text-foreground">
				{m.lesson_shell_progress({ current: String(current), total: String(total) })}
			</p>
			<div
				class="mt-2 h-3 overflow-hidden rounded-full"
				style="border: 1.5px solid var(--fp-ink); background: var(--fp-paper)"
				role="progressbar"
				aria-labelledby="lesson-progress-label"
				aria-valuenow={progress}
				aria-valuemin={0}
				aria-valuemax={100}
			>
				<div
					class="fp-progress-fill h-full"
					style="width: {progress}%; background: var(--fp-jaipur)"
				></div>
			</div>
		</div>
	</div>
	{@render children()}
</div>
