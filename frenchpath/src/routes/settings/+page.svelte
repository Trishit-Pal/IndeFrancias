<script lang="ts">
	import { onMount } from 'svelte';
	import { settingsRepo, resetDatabase, type Settings, type Theme, type UiLanguage } from '$lib/db';
	import { exportBackup, importBackup } from '$lib/pwa/backup';
	import { ensurePersistence, isPersisted } from '$lib/pwa/persist';
	import { applyTheme } from '$lib/theme/apply';
	import * as m from '$lib/paraglide/messages';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';

	let settings = $state<Settings | null>(null);
	let persisted = $state(false);
	let message = $state('');
	let confirmingReset = $state(false);

	const languages: { value: UiLanguage; label: string }[] = [
		{ value: 'en', label: 'English' },
		{ value: 'hi', label: 'हिन्दी' },
		{ value: 'hinglish', label: 'Hinglish' }
	];

	const themeOptions: { value: Theme; label: () => string }[] = [
		{ value: 'system', label: m.settings_theme_system },
		{ value: 'light', label: m.settings_theme_light },
		{ value: 'dark', label: m.settings_theme_dark }
	];

	const currentLocale = getLocale() as UiLanguage;

	async function changeLanguage(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value as UiLanguage;
		await settingsRepo.saveSettings({ uiLanguage: value });
		setLocale(value);
	}

	onMount(async () => {
		settings = await settingsRepo.getSettings();
		persisted = await isPersisted();
	});

	async function update(patch: Partial<Settings>) {
		settings = await settingsRepo.saveSettings(patch);
		document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
		if (patch.theme !== undefined) applyTheme(settings.theme);
	}

	async function requestPersist() {
		persisted = await ensurePersistence();
		message = persisted
			? 'Storage is now persistent — your data is protected from eviction.'
			: 'The browser did not grant persistent storage. Your data is still saved (best-effort).';
	}

	async function download() {
		const blob = new Blob([await exportBackup()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `frenchpath-backup-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
		message = 'Backup downloaded.';
	}

	async function onFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			await importBackup(await file.text());
			message = 'Backup restored. Reloading…';
			location.reload();
		} catch (error) {
			message = error instanceof Error ? error.message : 'Import failed.';
		}
	}

	async function reset() {
		await resetDatabase();
		location.reload();
	}

	const retentionOptions = [
		{ value: 0.8, label: '80% — fewer reviews' },
		{ value: 0.85, label: '85%' },
		{ value: 0.9, label: '90% — recommended' },
		{ value: 0.95, label: '95% — stronger recall' }
	];
	const goalOptions = [10, 20, 30, 50];
</script>

<svelte:head><title>Settings · FrenchPath</title></svelte:head>

<main class="page-shell">
	<h1 class="text-2xl font-bold text-foreground md:text-3xl">{m.settings_title()}</h1>

	{#if settings}
		<div class="mt-5 space-y-6">
			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">{m.settings_language()}</h2>
				<label class="mt-3 block text-sm text-muted" for="language">
					Interface language (Hindi / English / Hinglish)
				</label>
				<select
					id="language"
					class="field-input mt-1"
					value={currentLocale}
					onchange={changeLanguage}
					data-testid="language-select"
				>
					{#each languages as lang (lang.value)}
						<option value={lang.value}>{lang.label}</option>
					{/each}
				</select>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">{m.settings_theme()}</h2>
				<label class="mt-3 block text-sm text-muted" for="theme">
					{m.settings_theme()}
				</label>
				<select
					id="theme"
					class="field-input mt-1"
					value={settings.theme}
					onchange={(e) => update({ theme: e.currentTarget.value as Theme })}
					data-testid="theme-select"
				>
					{#each themeOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label()}</option>
					{/each}
				</select>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">Review</h2>
				<label class="mt-3 block text-sm text-muted" for="retention">
					Desired retention (FSRS)
				</label>
				<select
					id="retention"
					class="field-input mt-1"
					value={settings.targetRetention}
					onchange={(e) => update({ targetRetention: Number(e.currentTarget.value) })}
				>
					{#each retentionOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>

				<label class="mt-4 block text-sm text-muted" for="goal">Daily goal (XP)</label>
				<select
					id="goal"
					class="field-input mt-1"
					value={settings.dailyGoalXp}
					onchange={(e) => update({ dailyGoalXp: Number(e.currentTarget.value) })}
				>
					{#each goalOptions as goal (goal)}
						<option value={goal}>{goal} XP</option>
					{/each}
				</select>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">Accessibility</h2>
				<label class="mt-3 flex items-center justify-between">
					<span class="text-sm text-muted">Reduce motion</span>
					<input
						type="checkbox"
						class="h-5 w-5 accent-primary"
						checked={settings.reduceMotion}
						onchange={(e) => update({ reduceMotion: e.currentTarget.checked })}
					/>
				</label>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">Storage & backup</h2>
				<p class="mt-2 text-sm text-muted">
					Persistent storage: <span class="font-medium text-foreground"
						>{persisted ? 'on' : 'best-effort'}</span
					>
				</p>
				{#if !persisted}
					<button type="button" class="btn-secondary mt-2 text-sm" onclick={requestPersist}>
						Request persistent storage
					</button>
				{/if}
				<div class="mt-3 flex flex-wrap gap-2">
					<button type="button" class="btn-primary text-sm" onclick={download}>Export backup</button
					>
					<label class="btn-secondary cursor-pointer text-sm">
						Import backup
						<input type="file" accept="application/json" class="hidden" onchange={onFile} />
					</label>
				</div>
			</section>

			<section
				class="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
			>
				<h2 class="font-semibold text-red-900 dark:text-red-200">Danger zone</h2>
				{#if confirmingReset}
					<p class="mt-2 text-sm text-red-800 dark:text-red-300">
						Erase all progress on this device? This cannot be undone.
					</p>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white dark:bg-red-500 dark:text-black"
							onclick={reset}>Yes, erase everything</button
						>
						<button
							type="button"
							class="btn-secondary text-sm"
							onclick={() => (confirmingReset = false)}
						>
							Cancel
						</button>
					</div>
				{:else}
					<button
						type="button"
						class="mt-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-700 dark:text-red-300"
						onclick={() => (confirmingReset = true)}>Reset all progress</button
					>
				{/if}
			</section>

			{#if message}
				<p class="text-sm text-muted" role="status">{message}</p>
			{/if}
		</div>
	{/if}
</main>
