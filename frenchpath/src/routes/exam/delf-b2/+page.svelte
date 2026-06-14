<script lang="ts">
	import { onMount } from 'svelte';
	import { DELF_B2 } from '../../../content/exams/delf-b2';
	import type MockExamRunnerComponent from '$lib/exam/MockExamRunner.svelte';

	let MockExamRunner = $state<typeof MockExamRunnerComponent | null>(null);

	onMount(async () => {
		MockExamRunner = (await import('$lib/exam/MockExamRunner.svelte')).default;
	});
</script>

{#if MockExamRunner}
	<MockExamRunner exam={DELF_B2} assessmentId="delf_mock:b2" assessmentSlug="delf-b2" />
{/if}
