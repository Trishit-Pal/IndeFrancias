<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let { onComplete }: { onComplete: () => void } = $props();

	const points = [
		{ icon: '🌉', text: m.onb_p1 },
		{ icon: '📴', text: m.onb_p2 },
		{ icon: '🧠', text: m.onb_p3 },
		{ icon: '🇮🇳', text: m.onb_p4 },
		{ icon: '❄️', text: m.onb_p5 }
	];
</script>

<section class="page-shell flex min-h-dvh flex-col justify-center py-10 text-center">
	<img src="/icon.svg" alt="" class="mx-auto h-20 w-20 rounded-2xl shadow-sm" />
	<h1 class="mt-5 text-3xl font-bold text-foreground md:text-4xl">{m.onb_title()}</h1>
	<p class="mt-2 text-muted md:text-lg">{m.onb_subtitle()}</p>

	<ul
		class="mx-auto mt-8 max-w-lg space-y-3 text-left md:grid md:grid-cols-2 md:gap-3 md:space-y-0"
	>
		{#each points as point (point.icon)}
			<li class="surface-card flex items-center gap-3 p-3">
				<span class="text-2xl" aria-hidden="true">{point.icon}</span>
				<span class="text-sm text-foreground">{point.text()}</span>
			</li>
		{/each}
	</ul>

	<button
		type="button"
		class="btn-primary mx-auto mt-8 w-full max-w-lg text-lg"
		data-testid="onboarding-start"
		onclick={onComplete}
	>
		{m.onb_cta()}
	</button>
	<p
		class="mx-auto mt-3 max-w-lg rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
		role="note"
	>
		{m.onb_beta()}
	</p>
	<p class="mt-3 text-xs text-muted">{m.onb_footnote()}</p>
</section>
