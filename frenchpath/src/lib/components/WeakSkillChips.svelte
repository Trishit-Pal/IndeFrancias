<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { skillProfileRepo } from '$lib/db';
	import type { Skill, SkillProfileRecord } from '$lib/db/schema';
	import * as m from '$lib/paraglide/messages';

	const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

	const SKILL_LABELS: Record<Skill, () => string> = {
		listening: m.weak_skill_listening,
		reading: m.weak_skill_reading,
		spokenInteraction: m.weak_skill_speaking_interaction,
		spokenProduction: m.weak_skill_speaking_production,
		writing: m.weak_skill_writing
	};

	let profiles = $state<SkillProfileRecord[]>([]);

	const weakest = $derived(
		[...profiles]
			.sort((a, b) => LEVEL_ORDER.indexOf(a.estimatedLevel) - LEVEL_ORDER.indexOf(b.estimatedLevel))
			.slice(0, 2)
	);

	onMount(async () => {
		profiles = await skillProfileRepo.getAllSkillProfiles();
	});
</script>

{#if weakest.length > 0}
	<section class="surface-card p-3" data-testid="weak-skill-chips">
		<p class="text-xs font-semibold tracking-wide text-muted uppercase">{m.weak_skills_title()}</p>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each weakest as profile (profile.skill)}
				<a
					href={resolve('/review')}
					class="rounded-full border border-primary/40 bg-jaipur-light px-3 py-1.5 text-sm font-medium text-primary hover:border-primary"
					data-testid="weak-skill-{profile.skill}"
				>
					{SKILL_LABELS[profile.skill]()} · {profile.estimatedLevel}
				</a>
			{/each}
		</div>
	</section>
{/if}
