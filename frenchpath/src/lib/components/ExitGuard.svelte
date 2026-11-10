<!-- ExitGuard.svelte — "leave and lose this attempt?" for any session screen.  -->
<!-- The global tab bar and the browser's back button stay live during a       -->
<!-- lesson, checkpoint or mock exam; while `active()` is true every in-app    -->
<!-- departure is cancelled and routed through one confirm dialog.             -->
<!-- Usage: <ExitGuard bind:this={guard} active={() => inProgress} />, and     -->
<!-- call guard.requestExit() from the screen's own close control.             -->
<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Modal from '$lib/components/Modal.svelte';
	import * as m from '$lib/paraglide/messages';

	let { active }: { active: () => boolean } = $props();

	let open = $state(false);
	/** Where a confirmed exit goes: the tab the learner tapped, or home from a close control. */
	let target = $state<string | null>(null);
	let leaving = false;

	/** Close control: leave at once if nothing would be lost, otherwise confirm. */
	export function requestExit(): void {
		target = null;
		if (active()) open = true;
		else void goto(resolve('/'));
	}

	function confirmExit() {
		leaving = true;
		// target is the pathname SvelteKit handed us in beforeNavigate (already app-resolved).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(target ?? resolve('/'));
	}

	beforeNavigate((navigation) => {
		if (leaving || !active()) return;
		if (navigation.type === 'leave') return; // tab close / reload: the browser owns that prompt
		navigation.cancel();
		target = navigation.to?.url.pathname ?? null;
		open = true;
	});
</script>

<Modal
	{open}
	labelledby="lesson-exit-title"
	testid="lesson-exit-confirm"
	onClose={() => (open = false)}
>
	<h2 id="lesson-exit-title" class="text-lg font-semibold text-foreground">
		{m.lesson_exit_title()}
	</h2>
	<p class="mt-2 text-sm text-muted">{m.lesson_exit_body()}</p>
	<div class="mt-5 flex flex-wrap justify-end gap-2">
		<button
			type="button"
			class="btn-secondary text-sm"
			data-testid="lesson-exit-stay"
			onclick={() => (open = false)}>{m.lesson_exit_stay()}</button
		>
		<button
			type="button"
			class="btn-primary text-sm"
			data-testid="lesson-exit-leave"
			onclick={confirmExit}>{m.lesson_exit_confirm()}</button
		>
	</div>
</Modal>
