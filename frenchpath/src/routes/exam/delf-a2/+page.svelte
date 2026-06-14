<script lang="ts">
	import { onMount } from 'svelte';
	import { DELF_A2 } from '../../../content/exams/delf-a2';
	import type MockExamRunnerComponent from '$lib/exam/MockExamRunner.svelte';

	let MockExamRunner = $state<typeof MockExamRunnerComponent | null>(null);

	onMount(async () => {
		MockExamRunner = (await import('$lib/exam/MockExamRunner.svelte')).default;
	});
</script>

{#if MockExamRunner}
	<MockExamRunner exam={DELF_A2} assessmentId="delf_mock:a2" assessmentSlug="delf-a2" />
{/if}
