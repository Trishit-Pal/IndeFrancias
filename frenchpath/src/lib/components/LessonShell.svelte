<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let {
		progress,
		current,
		total,
		children
	}: {
		progress: number;
		current: number;
		total: number;
		children: import('svelte').Snippet;
	} = $props();
</script>

<div class="fp-lesson-shell">
	<div class="mb-4 flex items-center gap-4">
		<div
			class="fp-progress-ring relative h-14 w-14 shrink-0"
			style="--fp-progress: {progress}%"
			role="progressbar"
			aria-valuenow={progress}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={m.lesson_shell_progress({ current: String(current), total: String(total) })}
		>
			<span
				class="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary"
			>
				{current}/{total}
			</span>
		</div>
		<div class="flex-1">
			<p class="text-sm font-medium text-foreground">
				{m.lesson_shell_progress({ current: String(current), total: String(total) })}
			</p>
			<div
				class="mt-2 h-3 overflow-hidden rounded-full"
				style="border: 1.5px solid var(--fp-ink); background: var(--fp-paper)"
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
