<script lang="ts">
	import { onMount } from 'svelte';
	import { progressRepo, statsRepo, streakRepo, srsRepo } from '$lib/db';
	import { countDue } from '$lib/srs/queue';
	import { todayKey } from '$lib/utils/date';
	import * as m from '$lib/paraglide/messages';

	let streak = $state(0);
	let todayXp = $state(0);
	let completed = $state(0);
	let totalCards = $state(0);
	let due = $state(0);

	onMount(async () => {
		streak = (await streakRepo.getStreak()).currentStreak;
		todayXp = (await statsRepo.getStats(todayKey())).xp;
		completed = (await progressRepo.getAllProgress()).filter(
			(p) => p.status === 'completed'
		).length;
		totalCards = (await srsRepo.getAllCards()).length;
		due = await countDue();
	});

	const stats = $derived([
		{ label: m.stat_streak(), value: streak, icon: '🔥' },
		{ label: m.stat_xp(), value: todayXp, icon: '⭐' },
		{ label: m.stat_lessons(), value: completed, icon: '✅' },
		{ label: m.stat_cards(), value: totalCards, icon: '🧠' },
		{ label: m.stat_due(), value: due, icon: '🔁' }
	]);
</script>

<svelte:head><title>Progress · FrenchPath</title></svelte:head>

<main class="mx-auto min-h-dvh max-w-xl px-4 py-6">
	<h1 class="text-2xl font-bold text-slate-900">{m.progress_title()}</h1>
	<p class="text-sm text-slate-500">{m.progress_subtitle()}</p>

	<ul class="mt-5 grid grid-cols-2 gap-3">
		{#each stats as stat (stat.label)}
			<li class="rounded-xl border border-slate-200 bg-white p-4">
				<p class="text-2xl">{stat.icon}</p>
				<p class="mt-1 text-3xl font-bold text-slate-900">{stat.value}</p>
				<p class="text-sm text-slate-500">{stat.label}</p>
			</li>
		{/each}
	</ul>
</main>
