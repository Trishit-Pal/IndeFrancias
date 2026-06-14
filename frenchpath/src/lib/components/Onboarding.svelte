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

<section class="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-10 text-center">
	<img src="/icon.svg" alt="" class="mx-auto h-20 w-20 rounded-2xl shadow-sm" />
	<h1 class="mt-5 text-3xl font-bold text-slate-900">{m.onb_title()}</h1>
	<p class="mt-2 text-slate-600">{m.onb_subtitle()}</p>

	<ul class="mt-8 space-y-3 text-left">
		{#each points as point (point.icon)}
			<li class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
				<span class="text-2xl" aria-hidden="true">{point.icon}</span>
				<span class="text-sm text-slate-700">{point.text()}</span>
			</li>
		{/each}
	</ul>

	<button
		type="button"
		class="mt-8 min-h-11 w-full rounded-xl bg-blue-600 px-4 py-3 text-lg font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
		data-testid="onboarding-start"
		onclick={onComplete}
	>
		{m.onb_cta()}
	</button>
	<p
		class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
		role="note"
	>
		{m.onb_beta()}
	</p>
	<p class="mt-3 text-xs text-slate-400">{m.onb_footnote()}</p>
</section>
