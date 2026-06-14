<script lang="ts">
	import { onMount } from 'svelte';
	import { DALF_C1 } from '../../../content/exams/dalf-c1';
	import type MockExamRunnerComponent from '$lib/exam/MockExamRunner.svelte';

	let MockExamRunner = $state<typeof MockExamRunnerComponent | null>(null);

	onMount(async () => {
		MockExamRunner = (await import('$lib/exam/MockExamRunner.svelte')).default;
	});
</script>

{#if MockExamRunner}
	<MockExamRunner exam={DALF_C1} assessmentId="dalf_mock:c1" assessmentSlug="dalf-c1" />
{/if}
