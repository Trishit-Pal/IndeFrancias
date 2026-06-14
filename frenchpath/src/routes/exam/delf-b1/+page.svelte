<script lang="ts">
	import { onMount } from 'svelte';
	import { DELF_B1 } from '../../../content/exams/delf-b1';
	import type MockExamRunnerComponent from '$lib/exam/MockExamRunner.svelte';

	let MockExamRunner = $state<typeof MockExamRunnerComponent | null>(null);

	onMount(async () => {
		MockExamRunner = (await import('$lib/exam/MockExamRunner.svelte')).default;
	});
</script>

{#if MockExamRunner}
	<MockExamRunner exam={DELF_B1} assessmentId="delf_mock:b1" assessmentSlug="delf-b1" />
{/if}
